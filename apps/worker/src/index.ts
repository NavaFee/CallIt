// Keeper worker — milestone 2.
// Watches oracle::OracleSettled, then batch-redeems settled positions via
// predict::redeem_permissionless so payouts land without user action.
// Implemented after the core CLI round-trip (milestone 1).
export {};
