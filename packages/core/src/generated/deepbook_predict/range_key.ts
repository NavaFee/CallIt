/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::range_key';
export const RangeKey = new MoveStruct({ name: `${$moduleName}::RangeKey`, fields: {
        oracle_id: bcs.Address,
        expiry: bcs.u64(),
        lower_strike: bcs.u64(),
        higher_strike: bcs.u64()
    } });
export interface NewOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>
    ];
}
export function _new(options: NewOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        '0x2::object::ID',
        'u64',
        'u64',
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'range_key',
        function: 'new',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface OracleIdOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function oracleId(options: OracleIdOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'range_key',
        function: 'oracle_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface ExpiryOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function expiry(options: ExpiryOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'range_key',
        function: 'expiry',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface LowerStrikeOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function lowerStrike(options: LowerStrikeOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'range_key',
        function: 'lower_strike',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface HigherStrikeOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function higherStrike(options: HigherStrikeOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'range_key',
        function: 'higher_strike',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}