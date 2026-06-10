/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::risk_config';
export const RiskConfig = new MoveStruct({ name: `${$moduleName}::RiskConfig`, fields: {
        max_total_exposure_pct: bcs.u64()
    } });
export interface MaxTotalExposurePctOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function maxTotalExposurePct(options: MaxTotalExposurePctOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'risk_config',
        function: 'max_total_exposure_pct',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}