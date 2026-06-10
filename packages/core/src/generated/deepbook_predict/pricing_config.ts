/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::pricing_config';
export const PricingConfig = new MoveStruct({ name: `${$moduleName}::PricingConfig`, fields: {
        base_spread: bcs.u64(),
        min_spread: bcs.u64(),
        utilization_multiplier: bcs.u64(),
        min_ask_price: bcs.u64(),
        max_ask_price: bcs.u64()
    } });
export interface BaseSpreadOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function baseSpread(options: BaseSpreadOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pricing_config',
        function: 'base_spread',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface MinSpreadOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function minSpread(options: MinSpreadOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pricing_config',
        function: 'min_spread',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface UtilizationMultiplierOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function utilizationMultiplier(options: UtilizationMultiplierOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pricing_config',
        function: 'utilization_multiplier',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface MinAskPriceOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function minAskPrice(options: MinAskPriceOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pricing_config',
        function: 'min_ask_price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface MaxAskPriceOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function maxAskPrice(options: MaxAskPriceOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'pricing_config',
        function: 'max_ask_price',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}