import { Address, BigInt, dataSource, log } from '@graphprotocol/graph-ts'

import {
  ADDRESS_ZERO,
  fetchMemberValue,
  getOrCreateMember,
  setExecutor
} from './../utils'
import { Account, Member } from '../../generated/schema'
import {
  Change as ChangeEvent,
  Transfer as TransferEvent,
  Update as UpdateEvent
} from './../../generated/templates/MemberInitializable/Member'

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

    log.info('DAO Member Created. Member {}, Account {}, DAO {}', [
      member.id,
      member.account,
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
  let account = Account.load(member.account)
  if (account === null) {
    log.warning('DAO Member Update. Account {} not found', [member.account])
    return
  }
  const info = fetchMemberValue(memberAddress, tokenId)
  account.name = info.name
  account.description = info.description
  account.image = info.image
  account.votes = info.votes
  account.save()

  log.info('Account Update. User {}', [account.id])
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
