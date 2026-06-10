/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::rate_limiter';
export const RateLimiter = new MoveStruct({ name: `${$moduleName}::RateLimiter`, fields: {
        available: bcs.u64(),
        last_updated_ms: bcs.u64(),
        capacity: bcs.u64(),
        refill_rate_per_ms: bcs.u64(),
        enabled: bcs.bool()
    } });