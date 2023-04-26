import { DataSourceContext, log } from '@graphprotocol/graph-ts'

import { Created as CreatedEvent } from '../generated/DAOsFactory/DAOs'
import {
  DAOInitializable,
  LedgerInitializable,
  MemberInitializable,
  VotePoolInitializable
} from './../generated/templates'
import { DAOsFactory } from '../generated/schema'
import { ONE_BI, ZERO_BI, fetchDAOBasicValue, getOrCreateDAO } from './utils'

let FACTORY_ADDRESS = '0x4237E9a558Ff18Bac731ca8491573C97BbF2a60e'

export function handleCreated(event: CreatedEvent): void {
  let factory = DAOsFactory.load(FACTORY_ADDRESS)
  if (factory === null) {
    factory = new DAOsFactory(FACTORY_ADDRESS)
    factory.total = ZERO_BI
    factory.save()

    log.info('DAOs Factory initialized: {}', [factory.id])
  }
  factory.total = factory.total.plus(ONE_BI)
  factory.save()

  DAOInitializable.create(event.params.dao)
  log.info('DAO Contract initialized: {}', [event.params.dao.toHex()])

  const context = new DataSourceContext()
  context.setString('DAOAddress', event.params.dao.toHex())

  const dao = getOrCreateDAO(event.params.dao)
  dao.creator = dao.id.concat('-').concat(event.transaction.from.toHex())
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

  const memberAddress = daoBasicInfo.memberAddress
  MemberInitializable.createWithContext(memberAddress, context)
  log.info('Member Contract initialized: {}', [memberAddress.toHex()])

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
