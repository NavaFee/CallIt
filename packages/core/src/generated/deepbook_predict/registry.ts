/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as table from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/table.js';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::registry';
export const PredictCreated = new MoveStruct({ name: `${$moduleName}::PredictCreated`, fields: {
        predict_id: bcs.Address
    } });
export const OracleCreated = new MoveStruct({ name: `${$moduleName}::OracleCreated`, fields: {
        oracle_id: bcs.Address,
        oracle_cap_id: bcs.Address,
        underlying_asset: bcs.string(),
        expiry: bcs.u64(),
        min_strike: bcs.u64(),
        tick_size: bcs.u64()
    } });
export const AdminCap = new MoveStruct({ name: `${$moduleName}::AdminCap`, fields: {
        id: bcs.Address
    } });
export const Registry = new MoveStruct({ name: `${$moduleName}::Registry`, fields: {
        id: bcs.Address,
        predict_id: bcs.option(bcs.Address),
        oracle_ids: table.Table
    } });
export interface PredictIdOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function predictId(options: PredictIdOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'predict_id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface OracleIdsOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function oracleIds(options: OracleIdsOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        '0x2::object::ID'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'oracle_ids',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface CreatePredictOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function createPredict(options: CreatePredictOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'create_predict',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface RegisterOracleCapOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function registerOracleCap(options: RegisterOracleCapOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'register_oracle_cap',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface CreateOracleCapOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function createOracleCap(options: CreateOracleCapOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'create_oracle_cap',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface CreateOracleOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>
    ];
}
export function createOracle(options: CreateOracleOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        '0x1::string::String',
        'u64',
        'u64',
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'create_oracle',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface EnableQuoteAssetOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function enableQuoteAsset(options: EnableQuoteAssetOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'enable_quote_asset',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface DisableQuoteAssetOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function disableQuoteAsset(options: DisableQuoteAssetOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'disable_quote_asset',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface SetTradingPausedOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<boolean>
    ];
}
export function setTradingPaused(options: SetTradingPausedOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        'bool'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'set_trading_paused',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetBaseSpreadOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>
    ];
}
export function setBaseSpread(options: SetBaseSpreadOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'set_base_spread',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetMinSpreadOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>
    ];
}
export function setMinSpread(options: SetMinSpreadOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'set_min_spread',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetUtilizationMultiplierOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>
    ];
}
export function setUtilizationMultiplier(options: SetUtilizationMultiplierOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'set_utilization_multiplier',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetMinAskPriceOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>
    ];
}
export function setMinAskPrice(options: SetMinAskPriceOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'set_min_ask_price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetMaxAskPriceOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>
    ];
}
export function setMaxAskPrice(options: SetMaxAskPriceOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'set_max_ask_price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetOracleAskBoundsOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>
    ];
}
export function setOracleAskBounds(options: SetOracleAskBoundsOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null,
        'u64',
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'set_oracle_ask_bounds',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface ClearOracleAskBoundsOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function clearOracleAskBounds(options: ClearOracleAskBoundsOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'clear_oracle_ask_bounds',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SetMaxTotalExposurePctOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>
    ];
}
export function setMaxTotalExposurePct(options: SetMaxTotalExposurePctOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'set_max_total_exposure_pct',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface UpdateWithdrawalLimiterOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>
    ];
}
export function updateWithdrawalLimiter(options: UpdateWithdrawalLimiterOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        'u64',
        'u64',
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'update_withdrawal_limiter',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface EnableWithdrawalLimiterOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function enableWithdrawalLimiter(options: EnableWithdrawalLimiterOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'enable_withdrawal_limiter',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface DisableWithdrawalLimiterOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function disableWithdrawalLimiter(options: DisableWithdrawalLimiterOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'registry',
        function: 'disable_withdrawal_limiter',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}