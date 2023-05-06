import { dataSource, log } from '@graphprotocol/graph-ts'

import { TransferSingle as TransferSingleEvent } from './../../generated/templates/AssetInitializable/Asset'
import { fetchAssetValue } from '../fetch-contracts'

const context = dataSource.context()
const DAOAddress = context.getString('DAOAddress')

export function handleTransferSingle(event: TransferSingleEvent): void {
  log.info(
    'Asset TransferSingle. Asset Address {}, ID {}, From {}, To {}, Value {}',
    [
      dataSource.address().toHex(),
      event.params.id.toHex(),
      event.params.from.toHex(),
      event.params.to.toHex(),
      event.params.value.toHex()
    ]
  )

  fetchAssetValue(dataSource.address(), event.params.id)
}
