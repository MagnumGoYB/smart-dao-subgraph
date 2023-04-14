import { Address, dataSource, log } from '@graphprotocol/graph-ts'

import { ADDRESS_ZERO, getOrCreateMember } from './../utils'
import { Transfer as TransferEvent } from './../../generated/templates/MemberInitializable/Member'

const context = dataSource.context()
const DAOAddress = context.getString('DAOAddress')

export function handleTransfer(event: TransferEvent): void {
  log.info('DAO Member Transfer. Address {}, From {}, To {}, TokenId {}', [
    dataSource.address().toHex(),
    event.params.from.toHex(),
    event.params.to.toHex(),
    event.params.tokenId.toHex()
  ])

  if (
    ADDRESS_ZERO.equals(event.params.from) &&
    !ADDRESS_ZERO.equals(event.params.to)
  ) {
    const memberAddress = dataSource.address()
    const tokenId = event.params.tokenId
    const userAddress = event.params.to
    const member = getOrCreateMember(
      tokenId,
      memberAddress,
      userAddress,
      Address.fromString(DAOAddress)
    )

    log.info('DAO Member Created. Member {}, User {}, DAO {}', [
      member.id,
      member.user,
      member.dao
    ])
  }
}
