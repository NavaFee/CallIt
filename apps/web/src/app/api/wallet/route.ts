import { NextResponse } from 'next/server';
import { MOCK_FUNDS, cfg, predictService, suiClient } from '@/lib/server/clients';
import { getSession } from '@/lib/server/session';
import { tradingPortFor } from '@/lib/server/trading';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Layered wallet view: spendable wallet dUSDC vs funds inside the manager. */
export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });

  let walletUnits = 0n;
  let managerUnits = 0n;
  if (MOCK_FUNDS) {
    walletUnits = await tradingPortFor(session).getBalance();
  } else {
    walletUnits = BigInt(
      (await suiClient.getBalance({ owner: session.address, coinType: cfg.dusdcCoinType }))
        .totalBalance,
    );
    if (session.managerId) {
      managerUnits = await predictService.getManagerBalance(session.managerId).catch(() => 0n);
    }
  }

  return NextResponse.json({
    address: session.address,
    managerId: session.managerId,
    coinType: cfg.dusdcCoinType,
    mock: MOCK_FUNDS,
    walletUnits: walletUnits.toString(),
    managerUnits: managerUnits.toString(),
    faucetFormUrl:
      process.env.NEXT_PUBLIC_FAUCET_FORM_URL ??
      'https://github.com/MystenLabs/deepbookv3/tree/predict-testnet-4-16/packages/predict',
  });
}
