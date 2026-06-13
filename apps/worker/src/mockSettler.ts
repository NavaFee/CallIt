/**
 * Mock-custody settler: the prod deployment runs MOCK_FUNDS, where
 * settlements were client-driven — close the app and nothing settles, no DM.
 * This loop settles DB ledgers server-side against real oracle settlement
 * prices, so results (and Telegram DMs) land while the app is closed.
 * Exactly-once DMs are gated by the pick's open→settled transition.
 */
import {
  PredictIndexerClient,
  loadConfig,
  unitsToDusdc,
  type MockLedgerStateJSON,
} from '@callit/core';
import { allLedgers, getDb, resolvePick, saveLedger } from '@callit/db';
import { Bot } from 'grammy';
import { sendSettlementDM } from './bot.js';

const SCAN_INTERVAL_MS = 60_000;

const log = (msg: string) => console.log(`${new Date().toISOString()} ${msg}`);

export async function runMockSettler(): Promise<void> {
  const db = getDb();
  if (!db) {
    log('mock settler disabled — no DATABASE_URL');
    return;
  }
  const cfg = loadConfig();
  const indexer = new PredictIndexerClient(cfg.indexerUrl);
  log('mock settler starting (60s ledger scan)');

  for (;;) {
    try {
      const oracleCache = new Map<string, { settled: boolean; price: bigint | null }>();
      const ledgers = await allLedgers(db);
      for (const { userId, state } of ledgers) {
        const ledger = state as MockLedgerStateJSON;
        const due = ledger.positions.filter(
          (p) => p.status === 'open' && Number(p.expiry) <= Date.now(),
        );
        if (due.length === 0) continue;

        let changed = false;
        for (const row of due) {
          let oracle = oracleCache.get(row.oracleId);
          if (!oracle) {
            const { oracle: fresh } = await indexer.oracleState(row.oracleId);
            oracle = {
              settled: fresh.status === 'settled' && fresh.settlement_price != null,
              price: fresh.settlement_price != null ? BigInt(fresh.settlement_price) : null,
            };
            oracleCache.set(row.oracleId, oracle);
          }
          if (!oracle.settled || oracle.price == null) continue;

          const strike = BigInt(row.strike);
          const won = row.isUp ? oracle.price > strike : oracle.price <= strike;
          const payout = won ? BigInt(row.quantityUnits) : 0n;
          row.status = won ? 'won' : 'lost';
          row.payoutUnits = payout.toString();
          row.settledAt = Date.now();
          ledger.balanceUnits = (BigInt(ledger.balanceUnits) + payout).toString();
          changed = true;

          const resolution = await resolvePick(db, {
            pickId: row.id,
            result: won ? 'won' : 'lost',
            payoutUnits: payout,
          });
          log(
            `settled ${row.id.slice(0, 18)}… for ${userId.slice(0, 10)}… → ${won ? 'WON' : 'LOST'} ${unitsToDusdc(payout).toFixed(2)}`,
          );
          const token = process.env.TELEGRAM_BOT_TOKEN;
          if (resolution && token) {
            await sendSettlementDM(
              new Bot(token).api,
              db,
              userId,
              {
                won,
                payoutDusdc: unitsToDusdc(payout),
                costDusdc: unitsToDusdc(BigInt(row.costUnits)),
                isUp: row.isUp,
                strikeUsd: Number(row.strike) / 1e9,
                settleUsd: Number(oracle.price) / 1e9,
                streak: resolution.streak.current,
                balanceDusdc: unitsToDusdc(BigInt(ledger.balanceUnits)),
              },
              process.env.APP_URL ?? 'https://callit-seven.vercel.app',
            ).catch((err) => log(`DM failed: ${err}`));
          }
        }
        if (changed) await saveLedger(db, userId, ledger);
      }
    } catch (err) {
      log(`mock settler scan failed: ${err}`);
    }
    await new Promise((resolve) => setTimeout(resolve, SCAN_INTERVAL_MS));
  }
}
