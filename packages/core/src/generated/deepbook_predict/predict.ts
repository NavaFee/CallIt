/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as type_name from './deps/0x0000000000000000000000000000000000000000000000000000000000000001/type_name.js';
import * as vault from './vault.js';
import * as coin from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/coin.js';
import * as pricing_config from './pricing_config.js';
import * as risk_config from './risk_config.js';
import * as treasury_config from './treasury_config.js';
import * as oracle_config from './oracle_config.js';
import * as rate_limiter from './rate_limiter.js';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::predict';
export const PositionMinted = new MoveStruct({ name: `${$moduleName}::PositionMinted`, fields: {
        predict_id: bcs.Address,
        manager_id: bcs.Address,
        trader: bcs.Address,
        quote_asset: type_name.TypeName,
        oracle_id: bcs.Address,
        expiry: bcs.u64(),
        strike: bcs.u64(),
        is_up: bcs.bool(),
        quantity: bcs.u64(),
        cost: bcs.u64(),
        ask_price: bcs.u64()
    } });
export const PositionRedeemed = new MoveStruct({ name: `${$moduleName}::PositionRedeemed`, fields: {
        predict_id: bcs.Address,
        manager_id: bcs.Address,
        owner: bcs.Address,
        executor: bcs.Address,
        quote_asset: type_name.TypeName,
        oracle_id: bcs.Address,
        expiry: bcs.u64(),
        strike: bcs.u64(),
        is_up: bcs.bool(),
        quantity: bcs.u64(),
        payout: bcs.u64(),
        bid_price: bcs.u64(),
        is_settled: bcs.bool()
    } });
export const RangeMinted = new MoveStruct({ name: `${$moduleName}::RangeMinted`, fields: {
        predict_id: bcs.Address,
        manager_id: bcs.Address,
        trader: bcs.Address,
        quote_asset: type_name.TypeName,
        oracle_id: bcs.Address,
        expiry: bcs.u64(),
        lower_strike: bcs.u64(),
        higher_strike: bcs.u64(),
        quantity: bcs.u64(),
        cost: bcs.u64(),
        ask_price: bcs.u64()
    } });
export const RangeRedeemed = new MoveStruct({ name: `${$moduleName}::RangeRedeemed`, fields: {
        predict_id: bcs.Address,
        manager_id: bcs.Address,
        trader: bcs.Address,
        quote_asset: type_name.TypeName,
        oracle_id: bcs.Address,
        expiry: bcs.u64(),
        lower_strike: bcs.u64(),
        higher_strike: bcs.u64(),
        quantity: bcs.u64(),
        payout: bcs.u64(),
        bid_price: bcs.u64(),
        is_settled: bcs.bool()
    } });
export const TradingPauseUpdated = new MoveStruct({ name: `${$moduleName}::TradingPauseUpdated`, fields: {
        predict_id: bcs.Address,
        paused: bcs.bool()
    } });
export const PricingConfigUpdated = new MoveStruct({ name: `${$moduleName}::PricingConfigUpdated`, fields: {
        predict_id: bcs.Address,
        base_spread: bcs.u64(),
        min_spread: bcs.u64(),
        utilization_multiplier: bcs.u64(),
        min_ask_price: bcs.u64(),
        max_ask_price: bcs.u64()
    } });
export const OracleAskBoundsSet = new MoveStruct({ name: `${$moduleName}::OracleAskBoundsSet`, fields: {
        predict_id: bcs.Address,
        oracle_id: bcs.Address,
        min_ask_price: bcs.u64(),
        max_ask_price: bcs.u64()
    } });
export const OracleAskBoundsCleared = new MoveStruct({ name: `${$moduleName}::OracleAskBoundsCleared`, fields: {
        predict_id: bcs.Address,
        oracle_id: bcs.Address
    } });
export const RiskConfigUpdated = new MoveStruct({ name: `${$moduleName}::RiskConfigUpdated`, fields: {
        predict_id: bcs.Address,
        max_total_exposure_pct: bcs.u64()
    } });
export const QuoteAssetEnabled = new MoveStruct({ name: `${$moduleName}::QuoteAssetEnabled`, fields: {
        predict_id: bcs.Address,
        quote_asset: type_name.TypeName
    } });
export const QuoteAssetDisabled = new MoveStruct({ name: `${$moduleName}::QuoteAssetDisabled`, fields: {
        predict_id: bcs.Address,
        quote_asset: type_name.TypeName
    } });
export const Supplied = new MoveStruct({ name: `${$moduleName}::Supplied`, fields: {
        predict_id: bcs.Address,
        supplier: bcs.Address,
        quote_asset: type_name.TypeName,
        amount: bcs.u64(),
        shares_minted: bcs.u64()
    } });
export const Withdrawn = new MoveStruct({ name: `${$moduleName}::Withdrawn`, fields: {
        predict_id: bcs.Address,
        withdrawer: bcs.Address,
        quote_asset: type_name.TypeName,
        amount: bcs.u64(),
        shares_burned: bcs.u64()
    } });
export const Predict = new MoveStruct({ name: `${$moduleName}::Predict`, fields: {
        id: bcs.Address,
        vault: vault.Vault,
        treasury_cap: coin.TreasuryCap,
        pricing_config: pricing_config.PricingConfig,
        risk_config: risk_config.RiskConfig,
        treasury_config: treasury_config.TreasuryConfig,
        oracle_config: oracle_config.OracleConfig,
        withdrawal_limiter: rate_limiter.RateLimiter,
        trading_paused: bcs.bool()
    } });
export interface CreateManagerOptions {
    package?: string;
    arguments?: [
    ];
}
export function createManager(options: CreateManagerOptions = {}) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'create_manager',
    });
}
export interface GetTradeAmountsOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        TransactionArgument,
        RawTransactionArgument<number | bigint>
    ];
}
export function getTradeAmounts(options: GetTradeAmountsOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null,
        'u64',
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'get_trade_amounts',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface AskBoundsOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function askBounds(options: AskBoundsOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        '0x2::object::ID'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'ask_bounds',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface MintOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        TransactionArgument,
        RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string
    ];
}
export function mint(options: MintOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        'u64',
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'mint',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface CompactSettledOracleOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function compactSettledOracle(options: CompactSettledOracleOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'compact_settled_oracle',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface RedeemOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        TransactionArgument,
        RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string
    ];
}
export function redeem(options: RedeemOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        'u64',
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'redeem',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface RedeemPermissionlessOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        TransactionArgument,
        RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string
    ];
}
export function redeemPermissionless(options: RedeemPermissionlessOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        'u64',
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'redeem_permissionless',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface GetRangeTradeAmountsOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        TransactionArgument,
        RawTransactionArgument<number | bigint>
    ];
}
export function getRangeTradeAmounts(options: GetRangeTradeAmountsOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null,
        'u64',
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'get_range_trade_amounts',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface MintRangeOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        TransactionArgument,
        RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string
    ];
}
export function mintRange(options: MintRangeOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        'u64',
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'mint_range',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface RedeemRangeOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        TransactionArgument,
        RawTransactionArgument<number | bigint>
    ];
    typeArguments: [
        string
    ];
}
export function redeemRange(options: RedeemRangeOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null,
        null,
        'u64',
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'redeem_range',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface SupplyOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function supply(options: SupplyOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'supply',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface WithdrawOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
    typeArguments: [
        string
    ];
}
export function withdraw(options: WithdrawOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'withdraw',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
        typeArguments: options.typeArguments
    });
}
export interface TradingPausedOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function tradingPaused(options: TradingPausedOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'trading_paused',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface BaseSpreadOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function baseSpread(options: BaseSpreadOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'base_spread',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface AcceptedQuotesOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function acceptedQuotes(options: AcceptedQuotesOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'accepted_quotes',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface MinSpreadOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function minSpread(options: MinSpreadOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'min_spread',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface UtilizationMultiplierOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function utilizationMultiplier(options: UtilizationMultiplierOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'utilization_multiplier',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface MaxTotalExposurePctOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function maxTotalExposurePct(options: MaxTotalExposurePctOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'max_total_exposure_pct',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface AvailableWithdrawalOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function availableWithdrawal(options: AvailableWithdrawalOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'predict',
        function: 'available_withdrawal',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}