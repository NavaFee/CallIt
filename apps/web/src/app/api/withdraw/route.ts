import { NextResponse, type NextRequest } from 'next/server';
import { isValidSuiAddress, normalizeSuiAddress } from '@mysten/sui/utils';
import { transferDusdc } from '@callit/core';
import { MOCK_FUNDS, cfg, predictService, suiClient } from '@/lib/server/clients';
import { getSession, sessionKeypair } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Withdraw dUSDC to any Sui address. Pulls from the wallet first, then from
 * the manager's free balance (owner-only predict_manager::withdraw). Gas is
 * paid by the session wallet's sponsored SUI — the user never sees gas.
 */
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'no session' }, { status: 401 });
  if (MOCK_FUNDS) {
    return NextResponse.json(
      { error: 'practice funds live in a simulated ledger and cannot be withdrawn' },
      { status: 400 },
    );
  }

  let body: { to?: string; amountUnits?: string };
  try {
    body = (await req.json()) as { to?: string; amountUnits?: string };
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!body.to || !isValidSuiAddress(normalizeSuiAddress(body.to))) {
    return NextResponse.json({ error: 'invalid recipient address' }, { status: 400 });
  }
  const to = normalizeSuiAddress(body.to);
  const amount = BigInt(body.amountUnits ?? '0');
  if (amount <= 0n) return NextResponse.json({ error: 'amount must be positive' }, { status: 400 });

  try {
    const keypair = sessionKeypair(session);
    const walletUnits = BigInt(
      (await suiClient.getBalance({ owner: session.address, coinType: cfg.dusdcCoinType }))
        .totalBalance,
    );

    // pull the shortfall out of the manager first (own tx — the withdrawn
    // coin object must exist before the transfer can select it)
    if (walletUnits < amount) {
      if (!session.managerId) {
        return NextResponse.json({ error: 'insufficient balance' }, { status: 409 });
      }
      const managerUnits = await predictService.getManagerBalance(session.managerId);
      if (walletUnits + managerUnits < amount) {
        return NextResponse.json({ error: 'insufficient balance' }, { status: 409 });
      }
      const pull = await suiClient.signAndExecuteTransaction({
        transaction: predictService.buildManagerWithdrawTx({
          managerId: session.managerId,
          amountUnits: amount - walletUnits,
          recipient: session.address,
        }),
        signer: keypair,
        options: { showEffects: true },
      });
      if (pull.effects?.status.status !== 'success') {
        throw new Error(`manager withdraw failed: ${JSON.stringify(pull.effects?.status)}`);
      }
      await suiClient.waitForTransaction({ digest: pull.digest });
    }

    const digest = await transferDusdc(suiClient, cfg, keypair, to, amount);
    return NextResponse.json({ digest, amountUnits: amount.toString(), to });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'withdraw failed' },
      { status: 500 },
    );
  }
}
