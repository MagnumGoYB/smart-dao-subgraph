import { createDAO } from '../entities/DAO'
import { Created, OwnershipTransferred } from '../generated/contracts/DAOsProxyEvents'
import { DAODataSource } from '../generated/templates'

export function handleCreated(event: Created): void {
  let DAOAddress = event.params.dao

  createDAO(DAOAddress, event)

  DAODataSource.create(DAOAddress)
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}
