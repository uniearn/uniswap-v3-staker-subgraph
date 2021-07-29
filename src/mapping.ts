import { BigInt,Bytes,store } from "@graphprotocol/graph-ts"
import {
  DepositTransferred,
  IncentiveCreated,
  IncentiveEnded,
  RewardClaimed,
  TokenStaked,
  TokenUnstaked
} from "../generated/UniswapV3Staker/UniswapV3Staker"
import { Position,Incentive } from "../generated/schema"

import {Pool} from '../generated/UniswapV3Staker/Pool'


import { NonfungiblePositionManagerContract,factoryContract,TickMathContract,LiquidityAmountsContract } from './constants'

import {crypto,ethereum } from '@graphprotocol/graph-ts'


export function handleDepositTransferred(event: DepositTransferred): void {}

export function handleIncentiveCreated(event: IncentiveCreated): void {
  
  let rewardToken = event.params.rewardToken
  let pool = event.params.pool
  let startTime = event.params.startTime
  let endTime = event.params.endTime
  let refundee = event.params.refundee
  let reward = event.params.reward


  let tupleArray: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(rewardToken),
    ethereum.Value.fromAddress(pool),
    ethereum.Value.fromSignedBigInt(startTime),
    ethereum.Value.fromSignedBigInt(endTime),
    ethereum.Value.fromAddress(refundee),
  ];
  let tuple = tupleArray as ethereum.Tuple;
  let encoded = ethereum.encode(ethereum.Value.fromTuple(tuple))!;
  let incentiveId = crypto.keccak256(encoded).toHexString()
  
  let incentive = Incentive.load(incentiveId)
  if(incentive == null){
    incentive = new Incentive(incentiveId)
    incentive.count = 0
    incentive.amount0 = BigInt.fromI32(0)
    incentive.amount1 = BigInt.fromI32(0)
  }
  incentive.status = 1
  incentive.rewardToken = rewardToken.toHexString()
  incentive.pool = pool.toHexString()
  incentive.startTime = startTime
  incentive.endTime = endTime
  incentive.refundee = refundee.toHexString()
  incentive.reward = reward
  incentive.tx = event.transaction.hash.toHexString()

  incentive.save()
}

export function handleIncentiveEnded(event: IncentiveEnded): void {
  let incentiveId = event.params.incentiveId.toHexString()
  let incentive = Incentive.load(incentiveId)
  if(incentive != null){
    incentive.status = 0
  }
  incentive.save()
}

export function handleRewardClaimed(event: RewardClaimed): void {}

export function handleTokenStaked(event: TokenStaked): void {

  let id = event.params.incentiveId.toHexString() + event.params.tokenId.toString()
  let position = Position.load(id)
  if(position == null){
    position = new Position(id)
  }
  position.tokenId = event.params.tokenId
  position.incentiveId = event.params.incentiveId
  position.liquidity = event.params.liquidity
  position.owner = event.transaction.from
  position.tx = event.transaction.hash.toHexString()
  
  let amount0 = BigInt.fromI32(0)
  let amount1 = BigInt.fromI32(0)

  let positionResult = NonfungiblePositionManagerContract.try_positions(position.tokenId);
  if(!positionResult.reverted){
      let token0 = positionResult.value.value2
      let token1 = positionResult.value.value3
      let fee = positionResult.value.value4
      let tickLower = positionResult.value.value5
      let tickUpper = positionResult.value.value6

      position.tickLower = tickLower
      position.tickUpper = tickUpper

      let poolAddressResult = factoryContract.try_getPool(token0,token1,fee)
      if(!poolAddressResult.reverted){
        let poolAddress = poolAddressResult.value
        position.poolAddress = poolAddress.toHexString()

        let poolContract = Pool.bind(poolAddress)
        let poolResult = poolContract.try_slot0()
        if(!poolResult.reverted){
          let sqrtPriceX96 = poolResult.value.value0;
          position.sqrtPriceX96 = sqrtPriceX96;
          
          let sqrtRatioAX96Result = TickMathContract.try_getSqrtRatioAtTick(tickLower)
          let sqrtRatioBX96Result = TickMathContract.try_getSqrtRatioAtTick(tickUpper)
          
          if(!sqrtRatioAX96Result.reverted && !sqrtRatioBX96Result.reverted){
                let sqrtRatioAX96 = sqrtRatioAX96Result.value
                let sqrtRatioBX96 = sqrtRatioBX96Result.value
                position.sqrtRatioAX96 = sqrtRatioAX96
                position.sqrtRatioBX96 = sqrtRatioBX96
                let amountsResult = LiquidityAmountsContract.try_getAmountsForLiquidity(sqrtPriceX96,sqrtRatioAX96,sqrtRatioBX96,position.liquidity)
                if(!amountsResult.reverted){
                  amount0 = amountsResult.value.value0
                  amount1 = amountsResult.value.value1
                }
          }

        }
      }
  }
  
  position.amount0 = amount0
  position.amount1 = amount1
  
  position.save()

  let incentiveId = event.params.incentiveId.toHexString()
  let incentive = Incentive.load(incentiveId)
  if(incentive == null){
    incentive = new Incentive(incentiveId)
    incentive.count = 0
    incentive.amount0 = BigInt.fromI32(0)
    incentive.amount1 = BigInt.fromI32(0)
    incentive.status = 1
    incentive.rewardToken = '0x0'
    incentive.pool = '0x0'
    incentive.startTime = BigInt.fromI32(0)
    incentive.endTime = BigInt.fromI32(0)
    incentive.refundee = '0x0'
    incentive.reward = BigInt.fromI32(0)
    incentive.tx = '0x0'
  }

  incentive.count = incentive.count + 1
  incentive.amount0 = incentive.amount0.plus(amount0)
  incentive.amount1 = incentive.amount1.plus(amount1)
  incentive.save()

}

export function handleTokenUnstaked(event: TokenUnstaked): void {
  let id = event.params.incentiveId.toHexString() + event.params.tokenId.toString()

  let position = Position.load(id)
  if(position == null){
    position = new Position(event.params.tokenId.toString())
    position.amount0 = BigInt.fromI32(0)
    position.amount1 = BigInt.fromI32(0)
  }
  let amount0 = position.amount0 
  let amount1 = position.amount1

  store.remove('Position', id)

  let incentiveId = event.params.incentiveId.toHexString()
  let incentive = Incentive.load(incentiveId)
  if(incentive != null){
    incentive.count = incentive.count - 1
    incentive.amount0 = incentive.amount0.minus(amount0)
    incentive.amount1 = incentive.amount1.minus(amount1)
  }
  incentive.save()

}
