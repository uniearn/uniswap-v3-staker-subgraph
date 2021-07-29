/* eslint-disable prefer-const */
import { BigInt, BigDecimal, Address } from '@graphprotocol/graph-ts'
import {NonfungiblePositionManager} from '../generated/UniswapV3Staker/NonfungiblePositionManager'
import {Factory} from '../generated/UniswapV3Staker/Factory'
import {LiquidityAmounts} from '../generated/UniswapV3Staker/LiquidityAmounts'
import {TickMath} from '../generated/UniswapV3Staker/TickMath'


export const NonfungiblePositionManager_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
export const FACTORY_ADDRESS = '0x1F98431c8aD98523631AE4a59f267346ea31F984'
export const LiquidityAmounts_ADDRESS = '0x7F605995d3916d4C3fB60139dc19caB187f92581'
export const TickMath_ADDRESS = '0x073451aA8a9d7f6b37F1cB9d0883fD5A51879e81'


export let factoryContract = Factory.bind(Address.fromString(FACTORY_ADDRESS))
export let NonfungiblePositionManagerContract = NonfungiblePositionManager.bind(Address.fromString(NonfungiblePositionManager_ADDRESS))

export let LiquidityAmountsContract = LiquidityAmounts.bind(Address.fromString(LiquidityAmounts_ADDRESS))
export let TickMathContract = TickMath.bind(Address.fromString(TickMath_ADDRESS))
