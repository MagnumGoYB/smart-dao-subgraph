import { BigInt, log } from '@graphprotocol/graph-ts'

import { Created as CreatedEvent } from '../generated/DAOsFactory/DAOs'
import { DAOInitializable } from './../generated/templates'
import { DAOsFactory } from '../generated/schema'
import { fetchDAOBasicValue, getOrCreateDAO } from './utils'

let ZERO_BI = BigInt.fromI32(0)
let ONE_BI = BigInt.fromI32(1)
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

  let dao = getOrCreateDAO(event.params.dao)
  dao.owner = event.transaction.from
  dao.blockId = event.block.hash.toHex()
  dao.blockNumber = event.block.number
  dao.blockTimestamp = event.block.timestamp
  const daoPrimaryInfo = fetchDAOBasicValue(event.params.dao)
  dao.name = daoPrimaryInfo.name
  dao.description = daoPrimaryInfo.description
  dao.mission = daoPrimaryInfo.mission
  dao.extend = daoPrimaryInfo.extend
  dao.brandImage = daoPrimaryInfo.brandImage
  dao.save()

  DAOInitializable.create(event.params.dao)

  log.info('DAO initialized: {}', [dao.id])
}
