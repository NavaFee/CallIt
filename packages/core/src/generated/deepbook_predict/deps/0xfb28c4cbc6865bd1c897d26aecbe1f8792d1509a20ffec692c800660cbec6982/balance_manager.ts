/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct } from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import * as bag from '../0x0000000000000000000000000000000000000000000000000000000000000002/bag.js';
import * as vec_set from '../0x0000000000000000000000000000000000000000000000000000000000000002/vec_set.js';
const $moduleName = '0xfb28c4cbc6865bd1c897d26aecbe1f8792d1509a20ffec692c800660cbec6982::balance_manager';
export const BalanceManager = new MoveStruct({ name: `${$moduleName}::BalanceManager`, fields: {
        id: bcs.Address,
        owner: bcs.Address,
        balances: bag.Bag,
        allow_listed: vec_set.VecSet(bcs.Address)
    } });
export const DepositCap = new MoveStruct({ name: `0x984757fc7c0e6dd5f15c2c66e881dd6e5aca98b725f3dbd83c445e057ebb790a::balance_manager::DepositCap`, fields: {
        id: bcs.Address,
        balance_manager_id: bcs.Address
    } });
export const WithdrawCap = new MoveStruct({ name: `0x984757fc7c0e6dd5f15c2c66e881dd6e5aca98b725f3dbd83c445e057ebb790a::balance_manager::WithdrawCap`, fields: {
        id: bcs.Address,
        balance_manager_id: bcs.Address
    } });