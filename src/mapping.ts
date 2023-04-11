import { dataSource, log } from '@graphprotocol/graph-ts'

import { SetModule as SetModuleEvent } from './../generated/templates/DAOInitializable/DAO'

export function handleSetModule(event: SetModuleEvent): void {
  // const user = getOrCreateUser(dataSource.address(), event.params.user)
  // const pool = getOrCreateSmartChef(dataSource.address())
  // user.stakeToken = pool.stakeToken
  // user.stakeAmount = user.stakeAmount.plus(event.params.amount)
  // user.save()
  // log.info('DAO SetModule: {}', [])
}

// export function handleWithdraw(event: Withdraw): void {
//   const user = getOrCreateUser(dataSource.address(), event.params.user)
//   user.stakeAmount = user.stakeAmount.minus(event.params.amount)
//   user.save()
// }

// export function handleEmergencyWithdraw(event: EmergencyWithdraw): void {
//   const user = getOrCreateUser(dataSource.address(), event.params.user)
//   user.stakeAmount = BigInt.fromI32(0)
//   user.save()
// }

// export function handleNewStartAndEndBlocks(event: NewStartAndEndBlocks): void {
//   const pool = getOrCreateSmartChef(dataSource.address())
//   pool.startBlock = event.params.startBlock
//   pool.endBlock = event.params.endBlock
//   pool.save()
// }

// export function handleNewRewardPerBlock(event: NewRewardPerBlock): void {
//   const pool = getOrCreateSmartChef(dataSource.address())
//   const earnToken = getOrCreateToken(Address.fromString(pool.earnToken))
//   pool.reward = convertTokenToDecimal(
//     event.params.rewardPerBlock,
//     earnToken.decimals
//   )
//   pool.save()
// }
