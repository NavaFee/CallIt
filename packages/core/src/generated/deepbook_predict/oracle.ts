/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as i64 from './i64.js';
import * as vec_set from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/vec_set.js';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::oracle';
export const OracleActivated = new MoveStruct({ name: `${$moduleName}::OracleActivated`, fields: {
        oracle_id: bcs.Address,
        expiry: bcs.u64(),
        timestamp: bcs.u64()
    } });
export const OracleSettled = new MoveStruct({ name: `${$moduleName}::OracleSettled`, fields: {
        oracle_id: bcs.Address,
        expiry: bcs.u64(),
        settlement_price: bcs.u64(),
        timestamp: bcs.u64()
    } });
export const OraclePricesUpdated = new MoveStruct({ name: `${$moduleName}::OraclePricesUpdated`, fields: {
        oracle_id: bcs.Address,
        spot: bcs.u64(),
        forward: bcs.u64(),
        timestamp: bcs.u64()
    } });
export const OracleSVIUpdated = new MoveStruct({ name: `${$moduleName}::OracleSVIUpdated`, fields: {
        oracle_id: bcs.Address,
        a: bcs.u64(),
        b: bcs.u64(),
        rho: i64.I64,
        m: i64.I64,
        sigma: bcs.u64(),
        timestamp: bcs.u64()
    } });
export const SVIParams = new MoveStruct({ name: `${$moduleName}::SVIParams`, fields: {
        a: bcs.u64(),
        b: bcs.u64(),
        rho: i64.I64,
        m: i64.I64,
        sigma: bcs.u64()
    } });
export const PriceData = new MoveStruct({ name: `${$moduleName}::PriceData`, fields: {
        spot: bcs.u64(),
        forward: bcs.u64()
    } });
export const OracleSVI = new MoveStruct({ name: `${$moduleName}::OracleSVI`, fields: {
        id: bcs.Address,
        authorized_caps: vec_set.VecSet(bcs.Address),
        underlying_asset: bcs.string(),
        expiry: bcs.u64(),
        active: bcs.bool(),
        prices: PriceData,
        svi: SVIParams,
        timestamp: bcs.u64(),
        settlement_price: bcs.option(bcs.u64())
    } });
export const OracleSVICap = new MoveStruct({ name: `${$moduleName}::OracleSVICap`, fields: {
        id: bcs.Address
    } });
export interface ActivateOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>
    ];
}
export function activate(options: ActivateOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'activate',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface UpdatePricesOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        TransactionArgument
    ];
}
export function updatePrices(options: UpdatePricesOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'update_prices',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface UpdateSviOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>,
        RawTransactionArgument<string>,
        TransactionArgument
    ];
}
export function updateSvi(options: UpdateSviOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null,
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'update_svi',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface IdOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function id(options: IdOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'id',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface UnderlyingAssetOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function underlyingAsset(options: UnderlyingAssetOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'underlying_asset',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SpotPriceOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function spotPrice(options: SpotPriceOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'spot_price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface ForwardPriceOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function forwardPrice(options: ForwardPriceOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'forward_price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface PricesOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function prices(options: PricesOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'prices',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SviOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function svi(options: SviOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'svi',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SviAOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function sviA(options: SviAOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'svi_a',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SviBOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function sviB(options: SviBOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'svi_b',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SviRhoOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function sviRho(options: SviRhoOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'svi_rho',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SviMOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function sviM(options: SviMOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'svi_m',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SviSigmaOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function sviSigma(options: SviSigmaOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'svi_sigma',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface ExpiryOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function expiry(options: ExpiryOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'expiry',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface TimestampOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function timestamp(options: TimestampOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'timestamp',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SettlementPriceOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function settlementPrice(options: SettlementPriceOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'settlement_price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface IsSettledOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function isSettled(options: IsSettledOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'is_settled',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface IsActiveOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function isActive(options: IsActiveOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'is_active',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface StatusOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<string>
    ];
}
export function status(options: StatusOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        '0x2::clock::Clock'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'status',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface StatusInactiveOptions {
    package?: string;
    arguments?: [
    ];
}
export function statusInactive(options: StatusInactiveOptions = {}) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'status_inactive',
    });
}
export interface StatusActiveOptions {
    package?: string;
    arguments?: [
    ];
}
export function statusActive(options: StatusActiveOptions = {}) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'status_active',
    });
}
export interface StatusPendingSettlementOptions {
    package?: string;
    arguments?: [
    ];
}
export function statusPendingSettlement(options: StatusPendingSettlementOptions = {}) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'status_pending_settlement',
    });
}
export interface StatusSettledOptions {
    package?: string;
    arguments?: [
    ];
}
export function statusSettled(options: StatusSettledOptions = {}) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'status_settled',
    });
}
export interface NewPriceDataOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>
    ];
}
export function newPriceData(options: NewPriceDataOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        'u64',
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'new_price_data',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface NewSviParamsOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>,
        TransactionArgument,
        TransactionArgument,
        RawTransactionArgument<number | bigint>
    ];
}
export function newSviParams(options: NewSviParamsOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        'u64',
        'u64',
        null,
        null,
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'oracle',
        function: 'new_svi_params',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}