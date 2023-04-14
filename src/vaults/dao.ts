import { dataSource, log } from '@graphprotocol/graph-ts'

import { SetModule as SetModuleEvent } from './../../generated/templates/DAOInitializable/DAO'

export function handleSetModule(event: SetModuleEvent): void {
  log.info('DAO SetModule: {}', [dataSource.address().toHex()])
}
