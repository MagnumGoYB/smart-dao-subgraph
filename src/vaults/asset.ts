import { Address, dataSource, log } from '@graphprotocol/graph-ts'

import {
  ADDRESS_ZERO,
  ONE_BI,
  getOrCreateAsset,
  getOrCreateAssetOrder,
  getOrCreateAssetPool,
  getOrCreateStatistic
} from '../utils'
import {
  TransferBatch as TransferBatchEvent,
  TransferSingle as TransferSingleEvent
} from './../../generated/templates/AssetInitializable/Asset'

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
    asset.selling = 'Opensea'
    asset.sellPrice = event.transaction.value
    asset.owner = event.params.to.toHex()
    asset.save()

    pool.amountTotal = pool.amountTotal.plus(event.transaction.value)
    pool.orderTotal = pool.orderTotal.plus(ONE_BI)
    pool.orderAmountTotal = pool.orderAmountTotal.plus(event.transaction.value)
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
  }

  if (
    ADDRESS_ZERO.equals(event.params.to) &&
    !ADDRESS_ZERO.equals(event.params.from)
  ) {
    // Asset destroyed
    asset.owner = ADDRESS_ZERO.toHex()
    asset.destroyed = true
    asset.totalSupply = asset.totalSupply.minus(event.params.value)
    asset.save()

    pool.total = pool.total.minus(ONE_BI)
    pool.totalSupply = pool.totalSupply.minus(event.params.value)
    pool.amountTotal = pool.amountTotal.minus(event.transaction.value)
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

  getOrCreateAssetOrder(
    pool,
    asset,
    event.block,
    event.transaction,
    event.logIndex
  )
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

      asset.selling = 'Opensea'
      asset.sellPrice = event.transaction.value
      asset.owner = event.params.to.toHex()
      asset.save()

      pool.amountTotal = pool.amountTotal.plus(event.transaction.value)
      pool.orderTotal = pool.orderTotal.plus(ONE_BI)
      pool.orderAmountTotal = pool.orderAmountTotal.plus(
        event.transaction.value
      )
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
        event.block,
        event.transaction,
        event.logIndex
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

      asset.owner = ADDRESS_ZERO.toHex()
      asset.destroyed = true
      asset.totalSupply = asset.totalSupply.minus(event.params.values[i])
      asset.save()

      pool.total = pool.total.minus(ONE_BI)
      pool.totalSupply = pool.totalSupply.minus(event.params.values[i])
      pool.amountTotal = pool.amountTotal.minus(event.transaction.value)
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

      getOrCreateAssetOrder(
        pool,
        asset,
        event.block,
        event.transaction,
        event.logIndex
      )
    }
  }
}
