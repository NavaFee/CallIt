/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as table from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/table.js';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::oracle_config';
export const OracleGrid = new MoveStruct({ name: `${$moduleName}::OracleGrid`, fields: {
        min_strike: bcs.u64(),
        max_strike: bcs.u64(),
        tick_size: bcs.u64()
    } });
export const AskBounds = new MoveStruct({ name: `${$moduleName}::AskBounds`, fields: {
        min_ask_price: bcs.u64(),
        max_ask_price: bcs.u64()
    } });
export const OracleConfig = new MoveStruct({ name: `${$moduleName}::OracleConfig`, fields: {
        oracle_grids: table.Table,
        oracle_ask_bounds: table.Table
    } });
export const CurvePoint = new MoveStruct({ name: `${$moduleName}::CurvePoint`, fields: {
        strike: bcs.u64(),
        up_price: bcs.u64()
    } });
export interface NewCurvePointOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>
    ];
}
export function newCurvePoint(options: NewCurvePointOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        'u64',
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle_config',
        function: 'new_curve_point',
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
        module: 'oracle_config',
        function: 'strike',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface UpPriceOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function upPrice(options: UpPriceOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle_config',
        function: 'up_price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface AskBoundsMinOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function askBoundsMin(options: AskBoundsMinOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle_config',
        function: 'ask_bounds_min',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface AskBoundsMaxOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function askBoundsMax(options: AskBoundsMaxOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle_config',
        function: 'ask_bounds_max',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}