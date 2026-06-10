/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
const $moduleName = '0x2::balance';
export const Supply = new MoveStruct({ name: `${$moduleName}::Supply<phantom T0>`, fields: {
        value: bcs.u64()
    } });