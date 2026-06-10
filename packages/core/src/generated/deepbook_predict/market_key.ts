/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::market_key';
export const MarketKey = new MoveStruct({ name: `${$moduleName}::MarketKey`, fields: {
        oracle_id: bcs.Address,
        expiry: bcs.u64(),
        strike: bcs.u64(),
        direction: bcs.u8()
    } });
export interface UpOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>
    ];
}
export function up(options: UpOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        '0x2::object::ID',
        'u64',
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'market_key',
        function: 'up',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface DownOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>
    ];
}
export function down(options: DownOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        '0x2::object::ID',
        'u64',
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'market_key',
        function: 'down',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface NewOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<boolean>
    ];
}
export function _new(options: NewOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        '0x2::object::ID',
        'u64',
        'u64',
        'bool'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'market_key',
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
        module: 'market_key',
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
        module: 'market_key',
        function: 'expiry',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface StrikeOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function strike(options: StrikeOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'market_key',
        function: 'strike',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface IsUpOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function isUp(options: IsUpOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'market_key',
        function: 'is_up',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface IsDownOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function isDown(options: IsDownOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'market_key',
        function: 'is_down',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}