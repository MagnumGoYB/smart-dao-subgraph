import { Address, dataSource, log, BigInt } from '@graphprotocol/graph-ts'

import {
  ADDRESS_ZERO,
  ONE_BI,
  getOrCreateAsset,
  getOrCreateAssetOrder,
  getOrCreateAssetPool,
  getOrCreateAssetTxRecord,
  getOrCreateDAO,
  getOrCreateLedger,
  getOrCreateLedgerAssetIncome,
  getOrCreateStatistic
} from '../utils'
import { Asset, AssetTxRecord, LedgerPool } from '../../generated/schema'
import {
  Receive as ReceiveEvent,
  TransferBatch as TransferBatchEvent,
  TransferSingle as TransferSingleEvent,
  Unlock as UnlockEvent
} from './../../generated/templates/AssetInitializable/AssetShell'

const context = dataSource.context()
const DAOAddress = context.getString('DAOAddress')
const type = context.getString('type')

export function handleTransferSingle(event: TransferSingleEvent): void {
  log.info(
    'Asset TransferSingle. Asset Address {}, ID {}, From {}, To {}, Count {}, Amount {}',
    [
      dataSource.address().toHex(),
      event.params.id.toHex(),
      event.params.from.toHex(),
      event.params.to.toHex(),
      event.params.value.toHex(),
      event.transaction.value.toHex()
    ]
  )

  const statistic = getOrCreateStatistic()
  const pool = getOrCreateAssetPool(
    dataSource.address(),
    Address.fromString(DAOAddress),
    type
  )
  const asset = getOrCreateAsset(
    dataSource.address(),
    pool,
    event.params.id,
    event.params.to,
    event.block,
    event.transaction
  )

  if (
    !ADDRESS_ZERO.equals(event.params.from) &&
    !ADDRESS_ZERO.equals(event.params.to)
  ) {
    // Asset transferred
    asset.listed = true
    asset.selling = 'Opensea'
    asset.sellingTime = event.block.timestamp
    asset.sellPrice = event.transaction.value
    asset.owner = event.params.to.toHex()
    asset.save()

    pool.amountTotal = pool.amountTotal.plus(event.transaction.value)
    pool.save()

    log.info('Asset Transferred. Asset Address {}, ID {}, From {}, To {}', [
      dataSource.address().toHex(),
      event.params.id.toHex(),
      event.params.from.toHex(),
      event.params.to.toHex()
    ])

    statistic.totalAssetsOrder = statistic.totalAssetsOrder.plus(ONE_BI)
    statistic.totalAssetsOrderAmount = statistic.totalAssetsOrderAmount.plus(
      event.transaction.value
    )
    statistic.save()

    getOrCreateAssetOrder(
      pool,
      asset,
      event.params.from,
      event.params.to,
      event.block,
      event.transaction,
      event.logIndex
    )

    getOrCreateAssetTxRecord(
      dataSource.address(),
      asset.tokenId,
      event.transaction,
      event.block,
      event.params.from,
      event.params.to
    )
  }

  if (
    ADDRESS_ZERO.equals(event.params.to) &&
    !ADDRESS_ZERO.equals(event.params.from)
  ) {
    // Asset destroyed
    asset.listed = false
    asset.owner = ADDRESS_ZERO.toHex()
    asset.destroyed = true
    asset.totalSupply = asset.totalSupply.minus(event.params.value)
    asset.save()

    pool.total = pool.total.minus(ONE_BI)
    pool.totalSupply = pool.totalSupply.minus(event.params.value)
    pool.minimumPriceTotal = pool.minimumPriceTotal.minus(asset.minimumPrice)
    pool.save()

    statistic.totalDestroyedAssets = statistic.totalDestroyedAssets.plus(
      event.params.value
    )
    statistic.totalDestroyedAssetsAmount =
      statistic.totalDestroyedAssetsAmount.plus(event.transaction.value)
    statistic.save()

    log.info('Asset Destroyed. Asset Address {}, ID {}', [
      dataSource.address().toHex(),
      event.params.id.toHex()
    ])
  }
}

export function handleTransferBatch(event: TransferBatchEvent): void {
  log.info(
    'Asset TransferBatch. Asset Address {}, IDs {}, From {}, To {}, Count {}, Amount {}',
    [
      dataSource.address().toHex(),
      event.params.ids.toString(),
      event.params.from.toHex(),
      event.params.to.toHex(),
      event.params.values.toString(),
      event.transaction.value.toHex()
    ]
  )

  const statistic = getOrCreateStatistic()
  const pool = getOrCreateAssetPool(
    dataSource.address(),
    Address.fromString(DAOAddress),
    type
  )

  if (
    ADDRESS_ZERO.equals(event.params.from) &&
    !ADDRESS_ZERO.equals(event.params.to)
  ) {
    // Asset created
    for (let i = 0; i < event.params.ids.length; i++) {
      const asset = getOrCreateAsset(
        dataSource.address(),
        pool,
        event.params.ids[i],
        event.params.to,
        event.block,
        event.transaction
      )

      getOrCreateAssetOrder(
        pool,
        asset,
        event.params.from,
        event.params.to,
        event.block,
        event.transaction,
        event.logIndex
      )
    }
  }

  if (
    !ADDRESS_ZERO.equals(event.params.from) &&
    !ADDRESS_ZERO.equals(event.params.to)
  ) {
    // Asset transferred
    for (let i = 0; i < event.params.ids.length; i++) {
      const asset = getOrCreateAsset(
        dataSource.address(),
        pool,
        event.params.ids[i],
        event.params.to,
        event.block,
        event.transaction
      )

      asset.listed = true
      asset.selling = 'Opensea'
      asset.sellingTime = event.block.timestamp
      asset.sellPrice = event.transaction.value
      asset.owner = event.params.to.toHex()
      asset.save()

      pool.amountTotal = pool.amountTotal.plus(event.transaction.value)
      pool.save()

      log.info(
        'Asset Batch Transferred. Asset Address {}, ID {}, From {}, To {}',
        [
          dataSource.address().toHex(),
          event.params.ids[i].toHex(),
          event.params.from.toHex(),
          event.params.to.toHex()
        ]
      )

      statistic.totalAssetsOrder = statistic.totalAssetsOrder.plus(ONE_BI)
      statistic.totalAssetsOrderAmount = statistic.totalAssetsOrderAmount.plus(
        event.transaction.value
      )
      statistic.save()

      getOrCreateAssetOrder(
        pool,
        asset,
        event.params.from,
        event.params.to,
        event.block,
        event.transaction,
        event.logIndex
      )

      getOrCreateAssetTxRecord(
        dataSource.address(),
        asset.tokenId,
        event.transaction,
        event.block,
        event.params.from,
        event.params.to
      )
    }
  }

  if (
    ADDRESS_ZERO.equals(event.params.to) &&
    !ADDRESS_ZERO.equals(event.params.from)
  ) {
    // Asset destroyed
    for (let i = 0; i < event.params.ids.length; i++) {
      const asset = getOrCreateAsset(
        dataSource.address(),
        pool,
        event.params.ids[i],
        event.params.to,
        event.block,
        event.transaction
      )

      asset.listed = false
      asset.owner = ADDRESS_ZERO.toHex()
      asset.destroyed = true
      asset.totalSupply = asset.totalSupply.minus(event.params.values[i])
      asset.save()

      pool.total = pool.total.minus(ONE_BI)
      pool.totalSupply = pool.totalSupply.minus(event.params.values[i])
      pool.minimumPriceTotal = pool.minimumPriceTotal.minus(asset.minimumPrice)
      pool.save()

      statistic.totalDestroyedAssets = statistic.totalDestroyedAssets.plus(
        event.params.values[i]
      )
      statistic.totalDestroyedAssetsAmount =
        statistic.totalDestroyedAssetsAmount.plus(event.transaction.value)
      statistic.save()

      log.info('Asset Batch Destroyed. Asset Address {}, ID {}', [
        dataSource.address().toHex(),
        event.params.ids[i].toHex()
      ])
    }
  }
}

export function handleUnlock(event: UnlockEvent): void {
  log.info(
    'Asset Unlock. Asset Address {}, ERC-20 {}, TokenID {}, From {}, To {}, Amount {}, Count {}',
    [
      dataSource.address().toHex(),
      event.params.erc20.toHex(),
      event.params.tokenId.toHex(),
      event.params.from.toHex(),
      event.params.to.toHex(),
      event.params.amount.toString(),
      event.params.count.toString()
    ]
  )

  const pool = getOrCreateAssetPool(
    dataSource.address(),
    Address.fromString(DAOAddress),
    type
  )
  const asset = getOrCreateAsset(
    dataSource.address(),
    pool,
    event.params.tokenId,
    event.params.to,
    event.block,
    event.transaction
  )
  const dao = getOrCreateDAO(Address.fromString(DAOAddress))
  if (dao.ledgerPool) {
    const ledgerPool = LedgerPool.load(dao.ledgerPool!)
    if (ledgerPool) {
      const from = event.params.from
      const to = event.params.to
      const source = event.params.source
      const amount = event.params.amount
      const erc20 = event.params.erc20
      const ledger = getOrCreateLedger(
        BigInt.fromI32(5), // LedgerType = "0x5"
        Address.fromString(ledgerPool.id),
        event.transaction.hash,
        Address.fromString(DAOAddress),
        event.block,
        {
          from,
          to: source,
          amount,
          member: null,
          name: null,
          description: null,
          erc20: Address.zero().equals(erc20) ? null : erc20
        }
      )

      const ledgerAssetIncome = getOrCreateLedgerAssetIncome(
        ledgerPool,
        ledger,
        asset,
        event.transaction,
        {
          from,
          to,
          source,
          amount,
          price: amount.times(BigInt.fromI32(10_000)).div(pool.tax!),
          type,
          block: event.block,
          erc20: Address.zero().equals(erc20) ? null : erc20
        }
      )

      if (ledgerAssetIncome !== null) {
        ledger.assetIncome = ledgerAssetIncome.id
        ledger.save()
      }
    }
  }
}

export function handleReceive(event: ReceiveEvent): void {
  log.info('Asset Receive. Asset Address {}, Sender {}, Amount {}', [
    dataSource.address().toHex(),
    event.params.sender.toHex(),
    event.params.amount.toString()
  ])

  const txHash = event.transaction.hash
  const recordId = dataSource
    .address()
    .toHex()
    .concat('-')
    .concat(txHash.toHex())

  const record = AssetTxRecord.load(recordId)
  if (record) {
    log.debug('Asset Receive Record Loaded. Record {}', [recordId])

    const from = Address.fromBytes(record.from)
    const to = Address.fromBytes(record.to)
    const tokenId = record.tokenId
    const pool = getOrCreateAssetPool(
      dataSource.address(),
      Address.fromString(DAOAddress),
      type
    )

    const asset = getOrCreateAsset(
      dataSource.address(),
      pool,
      tokenId,
      to,
      event.block,
      event.transaction
    )

    const dao = getOrCreateDAO(Address.fromString(DAOAddress))
    if (dao.ledgerPool) {
      const ledgerPool = LedgerPool.load(dao.ledgerPool!)
      if (ledgerPool) {
        const amount = event.params.amount
        const ledger = getOrCreateLedger(
          BigInt.fromI32(5), // LedgerType = "0x5"
          Address.fromString(ledgerPool.id),
          event.transaction.hash,
          Address.fromString(DAOAddress),
          event.block,
          {
            from,
            to,
            amount,
            member: null,
            name: null,
            description: null,
            erc20: null
          }
        )

        const income = getOrCreateLedgerAssetIncome(
          ledgerPool,
          ledger,
          asset,
          event.transaction,
          {
            from,
            to,
            source: event.params.sender,
            amount,
            price: amount.times(BigInt.fromI32(10_000)).div(pool.tax!),
            type,
            block: event.block,
            erc20: null
          }
        )

        if (income !== null) {
          ledger.assetIncome = income.id
          ledger.save()
        }
      }
    }
  }
}
