/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as table from './deps/0x0000000000000000000000000000000000000000000000000000000000000002/table.js';
const $moduleName = '0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138::strike_matrix';
export const PageSummary = new MoveStruct({ name: `${$moduleName}::PageSummary`, fields: {
        total_q_up: bcs.u64(),
        total_q_dn: bcs.u64(),
        best_prefix_up: bcs.u64(),
        best_prefix_dn: bcs.u64()
    } });
export const StrikeMatrix = new MoveStruct({ name: `${$moduleName}::StrikeMatrix`, fields: {
        pages: table.Table,
        page_tree: bcs.vector(PageSummary),
        page_tree_leaf_count: bcs.u64(),
        tick_size: bcs.u64(),
        min_strike: bcs.u64(),
        max_strike: bcs.u64(),
        minted_min_strike: bcs.u64(),
        minted_max_strike: bcs.u64(),
        mtm: bcs.u64(),
        range_qty: bcs.u64()
    } });
export const StrikeNode = new MoveStruct({ name: `${$moduleName}::StrikeNode`, fields: {
        q_up: bcs.u64(),
        q_dn: bcs.u64(),
        agg_q_up: bcs.u64(),
        agg_qk_up: bcs.u64(),
        agg_q_dn: bcs.u64(),
        agg_qk_dn: bcs.u64()
    } });