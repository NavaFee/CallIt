/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as bag from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/bag.js';
import * as table from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/table.js';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::vault';
export const Vault = new MoveStruct({ name: `${$moduleName}::Vault`, fields: {
        balances: bag.Bag,
        balance: bcs.u64(),
        oracle_matrices: table.Table,
        settled_oracles: table.Table,
        total_mtm: bcs.u64(),
        total_max_payout: bcs.u64()
    } });
export const BalanceKey = new MoveStruct({ name: `${$moduleName}::BalanceKey<phantom T0>`, fields: {
        dummy_field: bcs.bool()
    } });
export const SettledOracleState = new MoveStruct({ name: `${$moduleName}::SettledOracleState`, fields: {
        remaining_quantity: bcs.u64(),
        remaining_liability: bcs.u64()
    } });
export interface BalanceOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function balance(options: BalanceOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'balance',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface AssetBalanceOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
    typeArguments: [
        string
    ];
}
export function assetBalance(options: AssetBalanceOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'asset_balance',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface TotalMtmOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function totalMtm(options: TotalMtmOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'total_mtm',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface VaultValueOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function vaultValue(options: VaultValueOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'vault_value',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface TotalMaxPayoutOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function totalMaxPayout(options: TotalMaxPayoutOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'vault',
        function: 'total_max_payout',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}