import { DataSourceContext, log } from '@graphprotocol/graph-ts'

import {
  ADDRESS_ZERO,
  fetchDAOBasicValue,
  getOrCreateAssetPool,
  getOrCreateDAO,
  getOrCreateLedgerPool,
  getOrCreateMemberInfo,
  getOrCreateVotePool
} from './utils'
import {
  AssetInitializable,
  DAOInitializable,
  LedgerInitializable,
  MemberInitializable,
  VotePoolInitializable
} from './../generated/templates'
import { Created as CreatedEvent } from '../generated/DAOsFactory/DAOs'

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

    dao.ledgerPool = getOrCreateLedgerPool(
      daoBasicInfo.ledgerAddress,
      event.params.dao
    ).id
  }

  MemberInitializable.createWithContext(daoBasicInfo.memberAddress, context)
  log.info('Member Contract initialized: {}', [
    daoBasicInfo.memberAddress.toHex()
  ])

  VotePoolInitializable.createWithContext(daoBasicInfo.votePoolAddress, context)
  log.info('VotePool Contract initialized: {}', [
    daoBasicInfo.votePoolAddress.toHex()
  ])

  if (daoBasicInfo.assetAddress) {
    AssetInitializable.createWithContext(daoBasicInfo.assetAddress, context)
    log.info('Asset Contract initialized: {}', [
      daoBasicInfo.assetAddress.toHex()
    ])
    dao.assetPool = getOrCreateAssetPool(
      daoBasicInfo.ledgerAddress,
      event.params.dao
    ).id
  }

  dao.name = daoBasicInfo.name
  dao.description = daoBasicInfo.description
  dao.mission = daoBasicInfo.mission
  dao.extend = daoBasicInfo.extend
  dao.image = daoBasicInfo.image
  dao.votePool = getOrCreateVotePool(
    daoBasicInfo.votePoolAddress,
    event.params.dao
  ).id
  dao.memberInfo = getOrCreateMemberInfo(
    daoBasicInfo.memberAddress,
    event.params.dao
  ).id
  dao.save()
}
