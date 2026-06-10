/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::i64';
export const I64 = new MoveStruct({ name: `${$moduleName}::I64`, fields: {
        magnitude: bcs.u64(),
        is_negative: bcs.bool()
    } });
export interface MagnitudeOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function magnitude(options: MagnitudeOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'i64',
        function: 'magnitude',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface IsNegativeOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function isNegative(options: IsNegativeOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'i64',
        function: 'is_negative',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface IsZeroOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function isZero(options: IsZeroOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'i64',
        function: 'is_zero',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface ZeroOptions {
    package?: string;
    arguments?: [
    ];
}
export function zero(options: ZeroOptions = {}) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'i64',
        function: 'zero',
    });
}
export interface FromU64Options {
    package?: string;
    arguments: [
        RawTransactionArgument<number | bigint>
    ];
}
export function fromU64(options: FromU64Options) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        'u64'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'i64',
        function: 'from_u64',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface FromPartsOptions {
    package?: string;
    arguments: [
        RawTransactionArgument<number | bigint>,
        RawTransactionArgument<boolean>
    ];
}
export function fromParts(options: FromPartsOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        'u64',
        'bool'
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'i64',
        function: 'from_parts',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface NegOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function neg(options: NegOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'i64',
        function: 'neg',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface AddOptions {
    package?: string;
    arguments: [
        TransactionArgument,
        TransactionArgument
    ];
}
export function add(options: AddOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'i64',
        function: 'add',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SubOptions {
    package?: string;
    arguments: [
        TransactionArgument,
        TransactionArgument
    ];
}
export function sub(options: SubOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'i64',
        function: 'sub',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface MulScaledOptions {
    package?: string;
    arguments: [
        TransactionArgument,
        TransactionArgument
    ];
}
export function mulScaled(options: MulScaledOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'i64',
        function: 'mul_scaled',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface DivScaledOptions {
    package?: string;
    arguments: [
        TransactionArgument,
        TransactionArgument
    ];
}
export function divScaled(options: DivScaledOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null,
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'i64',
        function: 'div_scaled',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}
export interface SquareScaledOptions {
    package?: string;
    arguments: [
        TransactionArgument
    ];
}
export function squareScaled(options: SquareScaledOptions) {
    const packageAddress = options.package ?? '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138';
    const argumentsTypes = [
        null
    ] satisfies (string | null)[];
    return (tx: Transaction) => tx.moveCall({
        package: packageAddress,
        module: 'i64',
        function: 'square_scaled',
        arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
    });
}