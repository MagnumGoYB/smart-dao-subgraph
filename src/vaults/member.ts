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
import { Member } from '../../generated/schema'

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
    const member = getOrCreateMember(
      event.params.to,
      Address.fromString(DAOAddress),
      event.params.tokenId,
      dataSource.address()
    )

    log.info('DAO Member Created. Member ID {}, Owner {}', [
      member.id,
      member.owner
    ])
  }
}

export function handleUpdate(event: UpdateEvent): void {
  const tokenId = event.params.id
  const id = Address.fromString(DAOAddress)
    .toHex()
    .concat('-')
    .concat(tokenId.toHex())
  let member = Member.load(id)
  if (member === null) {
    log.warning('DAO Member Update. ID {} Not Found', [id])
    return
  }
  const info = fetchMemberValue(dataSource.address(), tokenId)
  member.name = info.name
  member.description = info.description
  member.image = info.image
  member.votes = info.votes
  member.save()
  log.info('Member Update. ID {}', [member.id])
}

export function handleChange(event: ChangeEvent): void {
  log.info('DAO Member Change. Tag {}, Value {}', [
    event.params.tag.toHex(),
    event.params.value.toHex()
  ])

  if (event.params.tag.equals(BigInt.fromI32(8))) {
    setExecutor(Address.fromString(DAOAddress), event.params.value)
  }
}
