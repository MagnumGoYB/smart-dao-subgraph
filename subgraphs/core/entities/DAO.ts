import { Address, ethereum } from '@graphprotocol/graph-ts'

import { DAO } from '../generated/schema'

export function createDAO(address: Address, event: ethereum.Event): DAO {
  let dao = new DAO(address.toHex())
  dao.createdAt = event.block.timestamp.toI32()
  dao.updatedAt = dao.createdAt
  dao.save()
  return dao
}
