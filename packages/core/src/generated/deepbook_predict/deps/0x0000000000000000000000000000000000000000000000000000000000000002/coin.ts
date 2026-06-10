/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as balance from './balance.js';
const $moduleName = '0x2::coin';
export const TreasuryCap = new MoveStruct({ name: `${$moduleName}::TreasuryCap<phantom T0>`, fields: {
        id: bcs.Address,
        total_supply: balance.Supply
    } });