import { Address, dataSource, log } from '@graphprotocol/graph-ts'

import {
  ADDRESS_ZERO,
  ONE_BI,
  getOrCreateAsset,
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

  if (
    ADDRESS_ZERO.equals(event.params.from) &&
    !ADDRESS_ZERO.equals(event.params.to)
  ) {
    // Asset created
    getOrCreateAsset(
      dataSource.address(),
      Address.fromString(DAOAddress),
      event.params.id,
      event.params.to,
      event.transaction.value,
      type,
      event.block
    )

    log.info('Asset Created. Asset Address {}, ID {}, Owner {}', [
      dataSource.address().toHex(),
      event.params.id.toHex(),
      event.params.to.toHex()
    ])
  }

  if (
    !ADDRESS_ZERO.equals(event.params.from) &&
    !ADDRESS_ZERO.equals(event.params.to)
  ) {
    // Asset transferred
    const asset = getOrCreateAsset(
      dataSource.address(),
      Address.fromString(DAOAddress),
      event.params.id,
      event.params.to,
      event.transaction.value,
      type,
      event.block
    )

    asset.selling = 'Opensea'
    asset.sellPrice = event.transaction.value
    asset.owner = event.params.to.toHex()
    asset.save()

    const assetPool = getOrCreateAssetPool(
      dataSource.address(),
      Address.fromString(DAOAddress),
      type
    )
    assetPool.amountTotal = assetPool.amountTotal.plus(event.transaction.value)
    assetPool.save()

    log.info('Asset Transferred. Asset Address {}, ID {}, From {}, To {}', [
      dataSource.address().toHex(),
      event.params.id.toHex(),
      event.params.from.toHex(),
      event.params.to.toHex()
    ])
  }

  if (
    ADDRESS_ZERO.equals(event.params.to) &&
    !ADDRESS_ZERO.equals(event.params.from)
  ) {
    // Asset destroyed
    const asset = getOrCreateAsset(
      dataSource.address(),
      Address.fromString(DAOAddress),
      event.params.id,
      event.params.to,
      event.transaction.value,
      type,
      event.block
    )
    asset.owner = ADDRESS_ZERO.toHex()
    asset.state = 'Disable'
    asset.totalSupply = asset.totalSupply.minus(event.params.value)
    asset.save()

    const assetPool = getOrCreateAssetPool(
      dataSource.address(),
      Address.fromString(DAOAddress),
      type
    )
    assetPool.total = assetPool.total.minus(ONE_BI)
    assetPool.totalSupply = assetPool.totalSupply.minus(event.params.value)
    assetPool.amountTotal = assetPool.amountTotal.minus(event.transaction.value)
    assetPool.minimumPriceTotal = assetPool.minimumPriceTotal.minus(
      asset.minimumPrice
    )
    assetPool.save()

    const statistic = getOrCreateStatistic()
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

  if (
    ADDRESS_ZERO.equals(event.params.from) &&
    !ADDRESS_ZERO.equals(event.params.to)
  ) {
    // Asset created
    for (let i = 0; i < event.params.ids.length; i++) {
      getOrCreateAsset(
        dataSource.address(),
        Address.fromString(DAOAddress),
        event.params.ids[i],
        event.params.to,
        event.transaction.value,
        type,
        event.block
      )

      log.info('Asset Batch Created. Asset Address {}, ID {}, Owner {}', [
        dataSource.address().toHex(),
        event.params.ids[i].toHex(),
        event.params.to.toHex()
      ])
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
        Address.fromString(DAOAddress),
        event.params.ids[i],
        event.params.to,
        event.transaction.value,
        type,
        event.block
      )

      asset.selling = 'Opensea'
      asset.sellPrice = event.transaction.value
      asset.owner = event.params.to.toHex()
      asset.save()

      const assetPool = getOrCreateAssetPool(
        dataSource.address(),
        Address.fromString(DAOAddress),
        type
      )
      assetPool.amountTotal = assetPool.amountTotal.plus(
        event.transaction.value
      )
      assetPool.save()

      log.info(
        'Asset Batch Transferred. Asset Address {}, ID {}, From {}, To {}',
        [
          dataSource.address().toHex(),
          event.params.ids[i].toHex(),
          event.params.from.toHex(),
          event.params.to.toHex()
        ]
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
        Address.fromString(DAOAddress),
        event.params.ids[i],
        event.params.to,
        event.transaction.value,
        type,
        event.block
      )

      asset.owner = ADDRESS_ZERO.toHex()
      asset.state = 'Disable'
      asset.totalSupply = asset.totalSupply.minus(event.params.values[i])
      asset.save()

      const assetPool = getOrCreateAssetPool(
        dataSource.address(),
        Address.fromString(DAOAddress),
        type
      )
      assetPool.total = assetPool.total.minus(ONE_BI)
      assetPool.totalSupply = assetPool.totalSupply.minus(
        event.params.values[i]
      )
      assetPool.amountTotal = assetPool.amountTotal.minus(
        event.transaction.value
      )
      assetPool.minimumPriceTotal = assetPool.minimumPriceTotal.minus(
        asset.minimumPrice
      )
      assetPool.save()

      const statistic = getOrCreateStatistic()
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
