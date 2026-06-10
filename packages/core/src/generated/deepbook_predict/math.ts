/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface LnOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<number | bigint>
    ];
}
export function ln(options: LnOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'math',
        function: 'ln',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface ExpOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function exp(options: ExpOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'math',
        function: 'exp',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface NormalCdfOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function normalCdf(options: NormalCdfOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'math',
        function: 'normal_cdf',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SqrtOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>
    ];
}
export function sqrt(options: SqrtOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        'u64',
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'math',
        function: 'sqrt',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface MulDivRoundDownOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>
    ];
}
export function mulDivRoundDown(options: MulDivRoundDownOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        'u64',
        'u64',
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'math',
        function: 'mul_div_round_down',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface MulDivRoundUpOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<number | bigint>
    ];
}
export function mulDivRoundUp(options: MulDivRoundUpOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        'u64',
        'u64',
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'math',
        function: 'mul_div_round_up',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}