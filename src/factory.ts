import { BigInt, DataSourceContext, log } from '@graphprotocol/graph-ts'

import { Created as CreatedEvent } from '../generated/DAOsFactory/DAOs'
import { DAOInitializable, MemberInitializable } from './../generated/templates'
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

  let dao = getOrCreateDAO(event.params.dao)
  dao.creator = event.transaction.from.toHex()
  dao.blockId = event.block.hash.toHex()
  dao.blockNumber = event.block.number
  dao.blockTimestamp = event.block.timestamp
  const daoBasicInfo = fetchDAOBasicValue(event.params.dao)
  const memberAddress = daoBasicInfo.memberAddress

  let context = new DataSourceContext()
  context.setString('DAOAddress', event.params.dao.toHex())
  MemberInitializable.createWithContext(memberAddress, context)
  log.info('Member Contract initialized: {}', [memberAddress.toHex()])

  dao.name = daoBasicInfo.name
  dao.description = daoBasicInfo.description
  dao.mission = daoBasicInfo.mission
  dao.extend = daoBasicInfo.extend
  dao.image = daoBasicInfo.image
  dao.save()
}
