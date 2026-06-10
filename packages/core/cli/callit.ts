/**
 * CallIt CLI — drives the full DeepBook Predict round trip on Sui testnet.
 *
 *   pnpm cli wallet [--faucet]        wallet address + SUI/dUSDC balances
 *   pnpm cli status                   indexer + active oracle health
 *   pnpm cli quote --side up --stake 10
 *   pnpm cli setup                    create PredictManager (idempotent)
 *   pnpm cli bet --side up --stake 10 [--oracle 0x..] [--expiry-index 0]
 *   pnpm cli positions                open positions for the dev manager
 *   pnpm cli cashout --oracle 0x.. --strike 61352 --side up [--quantity N]
 *   pnpm cli redeem-settled           keeper primitive: claim all settled positions
 *   pnpm cli roundtrip                1 dUSDC mint → on-chain position read → redeem
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FaucetRateLimitError, getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import type { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { MIST_PER_SUI } from '@mysten/sui/utils';
import { loadConfig } from '../src/config.js';
import { evaluateOracleHealth, expiryLabel } from '../src/health.js';
import { PredictIndexerClient } from '../src/indexer/client.js';
import { OracleCache } from '../src/indexer/oracleCache.js';
import type { OracleRow } from '../src/indexer/types.js';
import { PredictService, type MarketParams } from '../src/chain/predictService.js';
import {
  dusdcToUnits,
  fixedToUsd,
  mintCost as calcMintCost,
  nearestStrike,
  payoutMultiplier,
  stakeToQuantity,
  unitsToDusdc,
  usdToFixed,
} from '../src/units.js';
import { loadOrCreateKeypair, loadManagerId, saveManagerId } from './wallet.js';

// Load repo-root .env if present (node ≥20.12)
try {
  process.loadEnvFile(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env'),
  );
} catch {
  // no .env yet — defaults cover testnet
}

const cfg = loadConfig();
const client = new SuiJsonRpcClient({
  url: cfg.rpcUrl ?? getJsonRpcFullnodeUrl(cfg.network as 'testnet'),
  network: cfg.network,
});
const indexer = new PredictIndexerClient(cfg.indexerUrl);
const oracleCache = new OracleCache(indexer, cfg.predictObjectId, {
  cacheFile: path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../.cache/oracles.json',
  ),
});
const service = new PredictService(client, cfg);

interface Args {
  command: string;
  flags: Map<string, string | boolean>;
}

function parseArgs(argv: string[]): Args {
  const [command = 'help', ...rest] = argv;
  const flags = new Map<string, string | boolean>();
  for (let i = 0; i < rest.length; i++) {
    const token = rest[i]!;
    if (!token.startsWith('--')) continue;
    const name = token.slice(2);
    const next = rest[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags.set(name, next);
      i++;
    } else {
      flags.set(name, true);
    }
  }
  return { command, flags };
}

function requireFlag(args: Args, name: string): string {
  const value = args.flags.get(name);
  if (typeof value !== 'string') {
    throw new Error(`missing required flag --${name}`);
  }
  return value;
}

const fmtUsd = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });
const fmtDusdc = (units: bigint) => `${unitsToDusdc(units).toFixed(2)} dUSDC`;
const short = (id: string) => `${id.slice(0, 6)}…${id.slice(-4)}`;

async function getWallet(): Promise<{ keypair: Ed25519Keypair; address: string }> {
  const { keypair, source } = loadOrCreateKeypair();
  const address = keypair.getPublicKey().toSuiAddress();
  console.log(`wallet  ${address}  (${source})`);
  return { keypair, address };
}

async function execute(keypair: Ed25519Keypair, tx: ReturnType<PredictService['buildCreateManagerTx']>) {
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true, showEvents: true, showBalanceChanges: true },
  });
  if (result.effects?.status.status !== 'success') {
    throw new Error(`transaction failed: ${JSON.stringify(result.effects?.status)}`);
  }
  await client.waitForTransaction({ digest: result.digest });
  return result;
}

/** Pick the betting oracle: --oracle id, or --expiry-index into active list (default 0 = soonest). */
async function pickOracle(args: Args): Promise<OracleRow> {
  const explicit = args.flags.get('oracle');
  const { rows: active, stale } = await oracleCache.getActive();
  if (stale) console.log('(indexer slow — using cached oracle list)');
  if (active.length === 0) {
    throw new Error('no active oracles on testnet right now');
  }
  if (typeof explicit === 'string') {
    const found = active.find((o) => o.oracle_id === explicit);
    if (!found) throw new Error(`oracle ${explicit} is not in the active set`);
    return found;
  }
  const index = Number(args.flags.get('expiry-index') ?? 0);
  const oracle = active[index];
  if (!oracle) throw new Error(`expiry index ${index} out of range (${active.length} active)`);
  return oracle;
}

/** Health-gated market construction at the ATM strike (the UI fuse, CLI edition). */
async function atmMarket(oracle: OracleRow, isUp: boolean): Promise<{ market: MarketParams; spotUsd: number }> {
  const state = await indexer.oracleState(oracle.oracle_id);
  const health = evaluateOracleHealth(state);
  if (!health.tradeable) {
    throw new Error(`oracle health fuse tripped: ${health.reason} — ${health.detail}`);
  }
  const strike = nearestStrike(
    usdToFixed(health.spotUsd),
    BigInt(oracle.min_strike),
    BigInt(oracle.tick_size),
  );
  return {
    market: { oracleId: oracle.oracle_id, expiry: BigInt(oracle.expiry), strike, isUp },
    spotUsd: health.spotUsd,
  };
}

async function ensureManager(keypair: Ed25519Keypair, address: string): Promise<string> {
  const saved = loadManagerId();
  if (saved) return saved;
  // recover from chain history if the local file was lost
  const existing = await indexer.managers({ owner: address }).catch(() => []);
  const mine = existing.find((m) => m.owner === address);
  if (mine) {
    saveManagerId(mine.manager_id);
    return mine.manager_id;
  }
  console.log('no PredictManager yet — creating one…');
  const result = await execute(keypair, service.buildCreateManagerTx());
  const managerId = service.extractManagerId(result);
  if (!managerId) throw new Error(`create_manager succeeded but no manager in objectChanges (${result.digest})`);
  saveManagerId(managerId);
  console.log(`manager ${managerId}`);
  console.log(`        tx ${result.digest}`);
  return managerId;
}

// ── commands ──────────────────────────────────────────────────────────

async function cmdWallet(args: Args) {
  const { address } = await getWallet();
  if (args.flags.get('faucet')) {
    console.log('requesting SUI from faucet…');
    try {
      await requestSuiFromFaucetV2({ host: getFaucetHost('testnet'), recipient: address });
      console.log('faucet request accepted');
    } catch (err) {
      if (err instanceof FaucetRateLimitError) {
        console.log('faucet rate-limited — try again later or use https://faucet.sui.io');
      } else {
        throw err;
      }
    }
  }
  const sui = await client.getBalance({ owner: address });
  const dusdc = await client.getBalance({ owner: address, coinType: cfg.dusdcCoinType });
  console.log(`SUI     ${(Number(sui.totalBalance) / Number(MIST_PER_SUI)).toFixed(4)}`);
  console.log(`dUSDC   ${unitsToDusdc(BigInt(dusdc.totalBalance)).toFixed(2)}`);
  const managerId = loadManagerId();
  if (managerId) {
    const managerBalance = await service.getManagerBalance(managerId);
    console.log(`manager ${managerId}\n        balance ${fmtDusdc(managerBalance)}`);
  }
}

async function cmdStatus() {
  const status = await indexer.status();
  console.log(`indexer ${status.status}, lag ${status.max_time_lag_seconds}s`);
  const { rows: active, stale } = await oracleCache.getActive();
  console.log(`active oracles: ${active.length}${stale ? ' (cached — indexer slow)' : ''}`);
  for (const oracle of active) {
    const state = await indexer.oracleState(oracle.oracle_id);
    const health = evaluateOracleHealth(state);
    const expiry = new Date(Number(oracle.expiry)).toISOString();
    if (health.tradeable) {
      console.log(
        `  ${short(oracle.oracle_id)}  ${oracle.underlying_asset}  expires ${expiry} (${expiryLabel(oracle)})  spot $${fmtUsd(health.spotUsd)}  feeds ${Math.round(health.priceAgeMs / 1000)}s/${Math.round(health.sviAgeMs / 1000)}s  ✓ tradeable`,
      );
    } else {
      console.log(
        `  ${short(oracle.oracle_id)}  ${oracle.underlying_asset}  expires ${expiry} (${expiryLabel(oracle)})  ✗ FUSE: ${health.reason} (${health.detail})`,
      );
    }
  }
}

async function cmdQuote(args: Args) {
  const side = requireFlag(args, 'side');
  const stake = Number(requireFlag(args, 'stake'));
  const oracle = await pickOracle(args);
  const { market, spotUsd } = await atmMarket(oracle, side === 'up');

  const probe = 1_000_000n; // quote 1 dUSDC of notional to learn the ask
  const { mintCost: unitCost } = await service.getTradeAmounts(market, probe);
  const ask = (unitCost * 1_000_000_000n) / probe;
  const quantity = stakeToQuantity(dusdcToUnits(stake), ask);
  const { mintCost, redeemPayout } = await service.getTradeAmounts(market, quantity);

  console.log(`oracle  ${oracle.oracle_id}`);
  console.log(`        ${oracle.underlying_asset} · expires ${new Date(Number(oracle.expiry)).toISOString()} (${expiryLabel(oracle)})`);
  console.log(`spot    $${fmtUsd(spotUsd)}`);
  console.log(`call    ${side.toUpperCase()} — BTC ${side === 'up' ? 'above' : 'at or below'} $${fmtUsd(fixedToUsd(market.strike))} at expiry`);
  console.log(`ask     ${(Number(ask) / 1e9).toFixed(4)}  (×${payoutMultiplier(ask).toFixed(2)} payout multiplier)`);
  console.log(`stake   ${stake.toFixed(2)} dUSDC → notional ${fmtDusdc(quantity)}`);
  console.log(`cost    ${fmtDusdc(mintCost)} now · wins ${fmtDusdc(quantity)} if settled in the money`);
  console.log(`cashout ${fmtDusdc(redeemPayout)} if redeemed immediately`);
}

async function cmdSetup() {
  const { keypair, address } = await getWallet();
  const managerId = await ensureManager(keypair, address);
  console.log(`manager ready: ${managerId}`);
}

async function cmdBet(args: Args) {
  const side = requireFlag(args, 'side');
  if (side !== 'up' && side !== 'down') throw new Error('--side must be up or down');
  const stake = Number(requireFlag(args, 'stake'));
  const { keypair, address } = await getWallet();
  const managerId = await ensureManager(keypair, address);
  const oracle = await pickOracle(args);
  const { market, spotUsd } = await atmMarket(oracle, side === 'up');

  // protocol-priced sizing: stake (premium) → notional quantity at current ask
  const probe = 1_000_000n;
  const { mintCost: unitCost } = await service.getTradeAmounts(market, probe);
  const ask = (unitCost * 1_000_000_000n) / probe;
  const quantity =
    args.flags.has('quantity')
      ? BigInt(requireFlag(args, 'quantity'))
      : stakeToQuantity(dusdcToUnits(stake), ask);
  const cost = calcMintCost(ask, quantity);

  console.log(`betting ${side.toUpperCase()} on ${oracle.underlying_asset} @ strike $${fmtUsd(fixedToUsd(market.strike))} (spot $${fmtUsd(spotUsd)})`);
  console.log(`        notional ${fmtDusdc(quantity)}, est. cost ${fmtDusdc(cost)} (ask ${(Number(ask) / 1e9).toFixed(4)})`);

  // top up the manager only for what's missing; 2% buffer absorbs ask drift
  const managerBalance = await service.getManagerBalance(managerId);
  const required = (cost * 102n) / 100n;
  const depositUnits = required > managerBalance ? required - managerBalance : 0n;

  const tx =
    depositUnits > 0n
      ? await service.buildDepositTx({
          owner: address,
          managerId,
          amountUnits: depositUnits,
          mint: { ...market, quantity },
        })
      : service.buildMintTx({ managerId, market, quantity });

  if (depositUnits > 0n) console.log(`        depositing ${fmtDusdc(depositUnits)} into manager in the same PTB`);
  const result = await execute(keypair, tx);
  const minted = service.extractPositionMinted(result);
  console.log(`✓ minted  tx ${result.digest}`);
  if (minted) {
    console.log(`  paid ${fmtDusdc(minted.cost)} at ask ${(Number(minted.askPrice) / 1e9).toFixed(4)} for ${fmtDusdc(minted.quantity)} notional`);
    console.log(`  wins ${fmtDusdc(minted.quantity)} if BTC ${minted.isUp ? '>' : '≤'} $${fmtUsd(fixedToUsd(minted.strike))} at ${new Date(Number(minted.expiry)).toISOString()}`);
  }
}

async function cmdPositions() {
  const managerId = loadManagerId();
  if (!managerId) throw new Error('no manager yet — run `pnpm cli setup`');
  const minted = await indexer.positionsMinted({ manager_id: managerId, limit: 50 });
  if (minted.length === 0) {
    console.log('no positions minted yet');
    return;
  }
  console.log(`minted positions for manager ${short(managerId)} (on-chain quantity may differ after redeems):`);
  for (const p of minted) {
    const market: MarketParams = {
      oracleId: p.oracle_id,
      expiry: BigInt(p.expiry),
      strike: BigInt(p.strike),
      isUp: p.is_up,
    };
    const held = await service.getPositionQuantity(managerId, market).catch(() => null);
    console.log(
      `  ${p.is_up ? 'UP  ' : 'DOWN'} strike $${fmtUsd(fixedToUsd(BigInt(p.strike)))}  expiry ${new Date(Number(p.expiry)).toISOString()}  minted ${fmtDusdc(BigInt(p.quantity))}  held ${held === null ? '?' : fmtDusdc(held)}  oracle ${short(p.oracle_id)}`,
    );
  }
}

async function cmdCashout(args: Args) {
  const side = requireFlag(args, 'side');
  const strikeUsd = Number(requireFlag(args, 'strike'));
  const oracleId = requireFlag(args, 'oracle');
  const { keypair } = await getWallet();
  const managerId = loadManagerId();
  if (!managerId) throw new Error('no manager yet — run `pnpm cli setup`');

  const { oracle } = await indexer.oracleState(oracleId);

  const market: MarketParams = {
    oracleId,
    expiry: BigInt(oracle.expiry),
    strike: usdToFixed(strikeUsd),
    isUp: side === 'up',
  };
  const held = await service.getPositionQuantity(managerId, market);
  if (held === 0n) throw new Error('no quantity held for that market key');
  const quantity = args.flags.has('quantity') ? BigInt(requireFlag(args, 'quantity')) : held;

  const { redeemPayout } = await service.getTradeAmounts(market, quantity);
  console.log(`cashing out ${fmtDusdc(quantity)} notional → est. ${fmtDusdc(redeemPayout)}`);
  const result = await execute(keypair, service.buildRedeemTx({ managerId, market, quantity }));
  const redeemed = service.extractPositionRedeemed(result);
  console.log(`✓ redeemed  tx ${result.digest}`);
  for (const r of redeemed) {
    console.log(`  payout ${fmtDusdc(r.payout)} at bid ${(Number(r.bidPrice) / 1e9).toFixed(4)} (settled: ${r.isSettled})`);
  }
}

/** Keeper primitive: redeem every settled-but-unclaimed position of our manager. */
async function cmdRedeemSettled() {
  const { keypair } = await getWallet();
  const managerId = loadManagerId();
  if (!managerId) throw new Error('no manager yet — run `pnpm cli setup`');

  const minted = await indexer.positionsMinted({ manager_id: managerId, limit: 200 });
  const oracleStatus = new Map<string, string>();
  for (const oracleId of new Set(minted.map((p) => p.oracle_id))) {
    const { oracle } = await indexer.oracleState(oracleId);
    oracleStatus.set(oracleId, oracle.status);
  }

  const claimable: Array<{ managerId: string; market: MarketParams; quantity: bigint }> = [];
  for (const p of minted) {
    if (oracleStatus.get(p.oracle_id) !== 'settled') continue;
    const market: MarketParams = {
      oracleId: p.oracle_id,
      expiry: BigInt(p.expiry),
      strike: BigInt(p.strike),
      isUp: p.is_up,
    };
    const held = await service.getPositionQuantity(managerId, market);
    if (held > 0n) claimable.push({ managerId, market, quantity: held });
  }
  if (claimable.length === 0) {
    console.log('nothing to claim — no settled positions with quantity');
    return;
  }
  console.log(`claiming ${claimable.length} settled position(s) permissionlessly…`);
  const result = await execute(keypair, service.buildRedeemPermissionlessTx(claimable));
  console.log(`✓ redeemed  tx ${result.digest}`);
  for (const r of service.extractPositionRedeemed(result)) {
    console.log(`  payout ${fmtDusdc(r.payout)} (settled: ${r.isSettled})`);
  }
}

/**
 * Acceptance test for milestone 1: real mint → authoritative position read →
 * real redeem, with a tiny stake, leaving the demo position untouched.
 */
async function cmdRoundtrip(args: Args) {
  const { keypair, address } = await getWallet();
  const managerId = await ensureManager(keypair, address);
  const oracle = await pickOracle(args);
  const { market, spotUsd } = await atmMarket(oracle, true);
  console.log(`roundtrip on ${short(oracle.oracle_id)} (${expiryLabel(oracle)} to expiry), spot $${fmtUsd(spotUsd)}`);

  const quantity = 1_000_000n; // 1 dUSDC notional
  const { mintCost } = await service.getTradeAmounts(market, quantity);
  console.log(`1│ quote: ${fmtDusdc(mintCost)} for ${fmtDusdc(quantity)} notional`);

  const managerBalance = await service.getManagerBalance(managerId);
  const required = (mintCost * 102n) / 100n;
  const depositUnits = required > managerBalance ? required - managerBalance : 0n;
  const mintTx =
    depositUnits > 0n
      ? await service.buildDepositTx({ owner: address, managerId, amountUnits: depositUnits, mint: { ...market, quantity } })
      : service.buildMintTx({ managerId, market, quantity });
  const mintResult = await execute(keypair, mintTx);
  const minted = service.extractPositionMinted(mintResult);
  console.log(`2│ minted: paid ${minted ? fmtDusdc(minted.cost) : '?'}  tx ${mintResult.digest}`);

  const held = await service.getPositionQuantity(managerId, market);
  console.log(`3│ on-chain position: ${fmtDusdc(held)} notional`);

  const redeemResult = await execute(keypair, service.buildRedeemTx({ managerId, market, quantity: held }));
  const redeemed = service.extractPositionRedeemed(redeemResult)[0];
  console.log(`4│ redeemed: ${redeemed ? fmtDusdc(redeemed.payout) : '?'}  tx ${redeemResult.digest}`);

  if (minted && redeemed) {
    const pnl = redeemed.payout - minted.cost;
    console.log(`✓ full round trip complete — spread cost ${fmtDusdc(-pnl)} (mint at ask, redeem at bid)`);
  }
}

const COMMANDS: Record<string, (args: Args) => Promise<void>> = {
  wallet: cmdWallet,
  status: () => cmdStatus(),
  quote: cmdQuote,
  setup: () => cmdSetup(),
  bet: cmdBet,
  positions: () => cmdPositions(),
  cashout: cmdCashout,
  'redeem-settled': () => cmdRedeemSettled(),
  roundtrip: cmdRoundtrip,
};

const args = parseArgs(process.argv.slice(2));
const handler = COMMANDS[args.command];
if (!handler) {
  console.log('commands: wallet [--faucet] · status · quote · setup · bet · positions · cashout · redeem-settled · roundtrip');
  process.exit(args.command === 'help' ? 0 : 1);
}
handler(args).catch((err) => {
  console.error(`✗ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
