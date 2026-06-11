import { MockTradingService, RealTradingService, type TradingPort } from '@callit/core';
import { MOCK_FUNDS, cfg, indexer, predictService, suiClient } from './clients';
import { ledgerStore } from './ledger';
import { sessionKeypair, type Session } from './session';

export { ledgerStore };

/** TradingPort for the current session — mock or real custody, same calls. */
export function tradingPortFor(session: Session): TradingPort {
  if (MOCK_FUNDS) {
    return new MockTradingService(session.address, ledgerStore(), predictService, indexer);
  }
  if (!session.managerId) {
    throw new Error('session has no PredictManager — re-register with a sponsor configured');
  }
  return new RealTradingService(
    suiClient,
    cfg,
    predictService,
    indexer,
    sessionKeypair(session),
    session.managerId,
  );
}
