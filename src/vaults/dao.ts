import { Address, BigInt, dataSource, log } from '@graphprotocol/graph-ts'

import { ADDRESS_ZERO, getOrCreateDAO, getOrCreateLedger } from '../utils'
import { Ledger } from '../../generated/schema'
import { SetModule as SetModuleEvent } from './../../generated/templates/DAOInitializable/DAO'

export function handleSetModule(event: SetModuleEvent): void {
  const daoAddress = dataSource.address()
  log.info('DAO {}, SetModule {}, Tag {}', [
    dataSource.address().toHex(),
    event.params.addr.toHex(),
    event.params.id.toHex()
  ])

  if (!ADDRESS_ZERO.equals(event.params.addr)) {
    const Module_LEDGER_ID = BigInt.fromU32(2).toU32() // Module_LEDGER_ID = "0x2"
    const id = event.params.id.toU32()
    switch (id) {
      case Module_LEDGER_ID:
        log.info('DAO Ledger Module {}', [event.params.addr.toHex()])
        const type = BigInt.fromU32(0) // LedgerType = "0x0"
        getOrCreateLedger(
          type,
          event.params.addr,
          event.transaction.hash,
          daoAddress,
          event.block,
          {
            from: null,
            balance: null,
            name: null,
            description: null,
            to: null,
            member: null
          }
        )
        break
    }
  }
}
