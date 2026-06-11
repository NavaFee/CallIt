/**
 * Welcome-stack size in dUSDC. NEXT_PUBLIC_ so the same value is inlined
 * into client copy and read by the server airdrop path — one env, no drift.
 */
export const WELCOME_DUSDC = Number(process.env.NEXT_PUBLIC_WELCOME_DUSDC ?? '25');
