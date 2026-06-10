# CallIt — call the market, win the pot

A gamified BTC prediction app built on [DeepBook Predict](https://github.com/MystenLabs/deepbookv3/tree/predict-testnet-4-16/packages/predict) for **Sui Overflow 2026** (DeepBook track).

Pick UP or DOWN on BTC, stake dUSDC, and get paid automatically when the oracle settles — no wallet extension, no seed phrase, no gas popups. Odds are priced by the protocol's live SVI volatility surface; a keeper claims payouts for you the moment the oracle settles.

🌐 Live now: **[callit-seven.vercel.app](https://callit-seven.vercel.app)** (→ callit.markets) · Sui testnet

Landing page at [/welcome](https://callit-seven.vercel.app/welcome) · mobile-first PWA + ≥1024px desktop HUD

## Architecture

```
callit-app/
├── apps/web        # Next.js PWA — betting, positions, streaks, leaderboard
├── apps/worker     # keeper (OracleSettled → redeem_permissionless) + Telegram notify bot
├── packages/core   # typed protocol bindings (@mysten/codegen), PredictService,
│                   # indexer client, oracle health fuse — all business logic, unit-tested
└── design/         # original design prototype (playable HTML, Claude Design)
```

Three read paths, per the protocol team's recommended integration model:

1. **predict-server REST** (public indexer) → rendering lists, history, portfolio
2. **Sui event stream** (`OraclePricesUpdated` / `OracleSVIUpdated` / `OracleSettled`) → second-level price freshness in the UI
3. **Direct on-chain reads** (devInspect on `get_trade_amounts`, `balance`, `position`) → quotes and confirmation-critical state around transactions

On-chain state (funds, positions) is the source of truth. Postgres only stores the social layer (streaks, leaderboards, badges) and can be rebuilt by replaying chain events.

### Protocol integration (Sui testnet)

| | |
|---|---|
| Predict package | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138` |
| Predict shared object | `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a` |
| Quote asset | `0xe950…3e1a::dusdc::DUSDC` (testnet-only, 6 decimals) |
| Indexer | `https://predict-server.testnet.mystenlabs.com` |

Bindings are generated with `@mysten/codegen` **directly from the deployed on-chain package**, so they always match live bytecode. Expiries are read dynamically from the active-oracle list — nothing is hardcoded, so when the protocol re-enables sub-hour rolling expiries the app becomes a 15-minute quick-call game with zero code changes.

One protocol reality worth knowing: `predict::create_manager` shares the `PredictManager` inside Move, so a brand-new account cannot deposit/mint in the same PTB. CallIt creates the manager at signup (sponsored), and every bet after that is a single `deposit + mint` PTB.

## Getting started

```bash
pnpm install
cp .env.example .env        # testnet defaults are pre-filled
pnpm --filter @callit/core test
```

### Web app

```bash
docker compose up -d                  # Postgres for streaks/leaderboard (optional)
pnpm --filter @callit/db push         # create tables
MOCK_FUNDS=1 pnpm --filter @callit/web dev
```

`MOCK_FUNDS=1` simulates custody only — every price, quote and settlement
result on screen is live DeepBook Predict testnet data. Remove the env var
(and fund the ops wallet) to switch to real on-chain custody with zero code
changes; the `TradingPort` interface is the seam.

### CLI (full on-chain round trip)

```bash
pnpm cli status                      # indexer health + active oracles + feed freshness
pnpm cli wallet --faucet             # dev wallet + testnet SUI
pnpm cli setup                       # create PredictManager (one-time)
pnpm cli quote --side up --stake 10  # protocol-priced payout preview
pnpm cli bet --side up --stake 10    # deposit + mint in one PTB
pnpm cli positions                   # on-chain position quantities
pnpm cli cashout --oracle 0x.. --strike 61352 --side up   # early redeem at bid
pnpm cli redeem-settled              # keeper primitive: claim settled positions
pnpm cli roundtrip                   # 1 dUSDC mint → position read → redeem (acceptance test)
```

dUSDC is a gated testnet asset — request it from the DeepBook team (official form / Telegram), then fund the address printed by `pnpm cli wallet`.

### Regenerating protocol bindings

```bash
brew install sui                     # sui CLI ≥ 1.51 needed by codegen
pnpm --filter @callit/core codegen   # regenerates packages/core/src/generated from chain
```

## Testing

| Layer | Tool | What |
|---|---|---|
| Unit | Vitest | scaling/odds math, strike grid, oracle health fuse, streak machine |
| Chain integration | Vitest (`RUN_CHAIN_TESTS=1`) | real testnet mint → position read → redeem |
| Bot | grammY `handleUpdate` | notification rendering without Telegram servers |
| E2E | Playwright | register → airdrop → bet → hold-to-cash-out → leaderboard/profile |
| Fault injection | Vitest | indexer timeout, stale oracle → betting disabled (fuse) |

## Safety rails

- Oracle health fuse: if the price/SVI feed goes stale (>25s) or the oracle is inactive, betting is disabled in the UI before the protocol would reject the transaction.
- Indexer is render-only; every transaction is confirmed against chain state directly.
- Secrets live in `.env` (gitignored); the ops wallet key never ships to clients.
