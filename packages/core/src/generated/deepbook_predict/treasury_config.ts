/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as vec_set from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/vec_set.js';
import * as type_name from './deps/0x0000000000000000000000000000000000000000000000000000000000000001/type_name.js';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::treasury_config';
export const TreasuryConfig = new MoveStruct({ name: `${$moduleName}::TreasuryConfig`, fields: {
        accepted_quotes: vec_set.VecSet(type_name.TypeName)
    } });
export interface AcceptedQuotesOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function acceptedQuotes(options: AcceptedQuotesOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'treasury_config',
        function: 'accepted_quotes',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface IsQuoteAssetOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
    typeArguments: [
        string
    ];
}
export function isQuoteAsset(options: IsQuoteAssetOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'treasury_config',
        function: 'is_quote_asset',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}