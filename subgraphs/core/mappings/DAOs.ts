import { ensureDAOs } from '../entities/DAOs'
import { Created } from '../generated/contracts/DAOsEvents'

export function handleCreated(event: Created): void {
  let DAOs = ensureDAOs(event.params.dao.toString(), event)
  DAOs.updatedAt = event.block.timestamp.toI32()
  DAOs.save()
}
