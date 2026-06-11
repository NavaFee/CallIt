/**
 * CallIt worker — single Railway service running three loops:
 *   1. keeper: settlement watch → batch redeem_permissionless
 *   2. notify bot: Telegram long-polling (binding + settlement DMs)
 *   3. ops monitor: airdrop-pool balance alerts to the admin chat
 */
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { loadConfig, unitsToDusdc } from '@callit/core';
import { Bot } from 'grammy';
import { runBot } from './bot.js';
import { runKeeper } from './keeper.js';

const MONITOR_INTERVAL_MS = 10 * 60_000;
const REALERT_MS = 6 * 3600_000;

const log = (msg: string) => console.log(`${new Date().toISOString()} ${msg}`);

/**
 * Ops-pool monitor: alerts the admin Telegram chat when the airdrop pool
 * drops below OPS_ALERT_DUSDC (default 400 = demo-day reserve 250 + public
 * beta floor 150). Re-alerts every 6h while low; logs always.
 */
async function runOpsMonitor(): Promise<void> {
  const pk = process.env.PRIVATE_KEY ?? process.env.OPS_WALLET_KEY;
  if (!pk) {
    log('ops monitor disabled — no PRIVATE_KEY');
    return;
  }
  const cfg = loadConfig();
  const client = new SuiJsonRpcClient({
    url: cfg.rpcUrl ?? getJsonRpcFullnodeUrl('testnet'),
    network: cfg.network,
  });
  const ops = Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(pk).secretKey)
    .getPublicKey()
    .toSuiAddress();
  const alertBelow = Number(process.env.OPS_ALERT_DUSDC ?? '400');
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChat = process.env.TG_ADMIN_CHAT_ID;
  let lastAlertAt = 0;

  log(`ops monitor watching ${ops.slice(0, 10)}… (alert below ${alertBelow} dUSDC)`);
  for (;;) {
    try {
      const [dusdc, sui] = await Promise.all([
        client.getBalance({ owner: ops, coinType: cfg.dusdcCoinType }),
        client.getBalance({ owner: ops }),
      ]);
      const pool = unitsToDusdc(BigInt(dusdc.totalBalance));
      const gas = Number(sui.totalBalance) / 1e9;
      log(`ops pool: ${pool.toFixed(2)} dUSDC · ${gas.toFixed(3)} SUI`);

      const lowPool = pool < alertBelow;
      const lowGas = gas < 0.3;
      if ((lowPool || lowGas) && Date.now() - lastAlertAt > REALERT_MS) {
        lastAlertAt = Date.now();
        const text =
          `⚠️ CallIt ops wallet alert\n` +
          (lowPool ? `Airdrop pool low: ${pool.toFixed(2)} dUSDC (alert < ${alertBelow})\n` : '') +
          (lowGas ? `Gas low: ${gas.toFixed(3)} SUI\n` : '') +
          `Wallet: ${ops}`;
        log(text.replace(/\n/g, ' · '));
        if (token && adminChat) {
          await new Bot(token).api
            .sendMessage(Number(adminChat), text)
            .catch((err) => log(`alert DM failed: ${err}`));
        }
      }
    } catch (err) {
      log(`ops monitor poll failed: ${err}`);
    }
    await new Promise((resolve) => setTimeout(resolve, MONITOR_INTERVAL_MS));
  }
}

async function main(): Promise<void> {
  const tasks = [runKeeper(), runOpsMonitor()];
  if (process.env.TELEGRAM_BOT_TOKEN) {
    tasks.push(runBot());
  } else {
    log('notify bot disabled — no TELEGRAM_BOT_TOKEN');
  }
  await Promise.all(tasks);
}

main().catch((err) => {
  console.error('worker crashed:', err);
  process.exit(1);
});
