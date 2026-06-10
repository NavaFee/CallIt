/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as balance_manager from './deps/0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982/balance_manager.js';
import * as table from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/table.js';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::predict_manager';
export const PredictManagerCreated = new MoveStruct({ name: `${$moduleName}::PredictManagerCreated`, fields: {
        manager_id: bcs.Address,
        owner: bcs.Address
    } });
export const PredictManager = new MoveStruct({ name: `${$moduleName}::PredictManager`, fields: {
        id: bcs.Address,
        owner: bcs.Address,
        balance_manager: balance_manager.BalanceManager,
        deposit_cap: balance_manager.DepositCap,
        withdraw_cap: balance_manager.WithdrawCap,
        positions: table.Table,
        range_positions: table.Table
    } });
export interface OwnerOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function owner(options: OwnerOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict_manager',
        function: 'owner',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface PositionOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        TransactionArgument
    ];
}
export function position(options: PositionOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict_manager',
        function: 'position',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface RangePositionOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        TransactionArgument
    ];
}
export function rangePosition(options: RangePositionOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict_manager',
        function: 'range_position',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface BalanceOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function balance(options: BalanceOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict_manager',
        function: 'balance',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface DepositOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function deposit(options: DepositOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict_manager',
        function: 'deposit',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface WithdrawOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string
    ];
}
export function withdraw(options: WithdrawOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict_manager',
        function: 'withdraw',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}