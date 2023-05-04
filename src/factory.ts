import { DataSourceContext, log } from '@graphprotocol/graph-ts'

import { Created as CreatedEvent } from '../generated/DAOsFactory/DAOs'
import {
  DAOInitializable,
  LedgerInitializable,
  MemberInitializable,
  VotePoolInitializable
} from './../generated/templates'
import { fetchDAOBasicValue, getOrCreateDAO } from './utils'

export function handleCreated(event: CreatedEvent): void {
  DAOInitializable.create(event.params.dao)
  log.info('DAO Contract initialized: {}', [event.params.dao.toHex()])

  const context = new DataSourceContext()
  context.setString('DAOAddress', event.params.dao.toHex())

  const dao = getOrCreateDAO(event.params.dao)
  dao.accounts = []
  dao.blockId = event.block.hash.toHex()
  dao.blockNumber = event.block.number
  dao.blockTimestamp = event.block.timestamp
  const daoBasicInfo = fetchDAOBasicValue(event.params.dao)

  if (daoBasicInfo.ledgerAddress) {
    LedgerInitializable.createWithContext(daoBasicInfo.ledgerAddress, context)
    log.info('Ledger Contract initialized: {}', [
      daoBasicInfo.ledgerAddress.toHex()
    ])
  }

  const memberInfoAddress = daoBasicInfo.memberAddress
  MemberInitializable.createWithContext(memberInfoAddress, context)
  log.info('Member Contract initialized: {}', [memberInfoAddress.toHex()])

  const votePoolAddress = daoBasicInfo.votePoolAddress
  VotePoolInitializable.createWithContext(votePoolAddress, context)
  log.info('VotePool Contract initialized: {}', [votePoolAddress.toHex()])

  dao.name = daoBasicInfo.name
  dao.description = daoBasicInfo.description
  dao.mission = daoBasicInfo.mission
  dao.extend = daoBasicInfo.extend
  dao.image = daoBasicInfo.image
  dao.save()
}
