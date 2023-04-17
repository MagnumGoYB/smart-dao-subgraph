import { Address, BigInt, dataSource, log } from '@graphprotocol/graph-ts'

import {
  ADDRESS_ZERO,
  fetchMemberValue,
  getOrCreateMember,
  setExecutor
} from './../utils'
import {
  Change as ChangeEvent,
  Transfer as TransferEvent,
  Update as UpdateEvent
} from './../../generated/templates/MemberInitializable/Member'
import { Member, User } from '../../generated/schema'

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

export function handleUpdate(event: UpdateEvent): void {
  const memberAddress = dataSource.address()
  const tokenId = event.params.id
  const memberId = memberAddress.toHex().concat('-').concat(tokenId.toHex())
  const member = Member.load(memberId)
  if (member === null) {
    log.warning('DAO Member Update. Member {} not found', [memberId])
    return
  }
  let user = User.load(member.user)
  if (user === null) {
    log.warning('DAO Member Update. User {} not found', [member.user])
    return
  }
  const info = fetchMemberValue(memberAddress, tokenId)
  user.name = info.name
  user.description = info.description
  user.image = info.image
  user.votes = info.votes
  user.save()

  log.info('User Update. User {}', [user.id])
}

export function handleChange(event: ChangeEvent): void {
  log.info('DAO Member Change. Tag {}, Value {}', [
    event.params.tag.toHex(),
    event.params.value.toHex()
  ])

  if (event.params.tag.equals(BigInt.fromI32(8))) {
    setExecutor(dataSource.address(), event.params.value)
  }
}
