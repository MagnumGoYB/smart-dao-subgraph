import { Created } from '../generated/DAOs/DAOs'
import { DAO } from '../generated/schema'

export function handleCreated(event: Created): void {
  let entity = new DAO(event.params.dao.toHex())
  entity.owner = event.transaction.from
  entity.blockId = event.block.hash.toHex()
  entity.blockNumber = event.block.number
  entity.save()
}
