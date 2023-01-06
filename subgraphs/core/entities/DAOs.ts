import { Bytes, ethereum } from '@graphprotocol/graph-ts'

import { DAOs } from '../generated/schema'

export function ensureDAOs(id: string, event: ethereum.Event): DAOs {
  let daos = DAOs.load(id)

  if (daos) {
    return daos
  }

  daos = new DAOs(id)
  daos.updatedAt = event.block.timestamp.toI32()
  daos.save()

  return daos
}
