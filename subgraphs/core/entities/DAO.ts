import { Address, ethereum } from '@graphprotocol/graph-ts'

import { DAOLibsSdk } from '../generated/contracts/DAOLibsSdk'
import { DAO } from '../generated/schema'
import { DAOEvents } from './../generated/contracts/DAOEvents'

export function createDAO(address: Address, event: ethereum.Event): DAO {
  let dao = new DAO(address.toHex())
  const tryDAOName = DAOLibsSdk.bind(address).try_name()
  if (!tryDAOName.reverted && tryDAOName.value) {
    dao.name = tryDAOName.value
  }
  dao.createdAt = event.block.timestamp.toI32()
  dao.updatedAt = dao.createdAt
  dao.save()
  return dao
}
