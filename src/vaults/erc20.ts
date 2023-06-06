import { Address, BigInt, dataSource, log } from '@graphprotocol/graph-ts'

import { AssetShell as AssetShellContract } from './../../generated/templates/AssetInitializable/AssetShell'
import { AssetTxRecord, LedgerPool } from '../../generated/schema'
import { Transfer as TransferEvent } from './../../generated/templates/ERC20Initializable/ERC20'
import {
  fetchDAOBasicValue,
  getOrCreateAsset,
  getOrCreateAssetPool,
  getOrCreateDAO,
  getOrCreateLedger,
  getOrCreateLedgerAssetIncome
} from '../utils'

const context = dataSource.context()
const DAOAddress = context.getString('DAOAddress')

export function handleTransfer(event: TransferEvent): void {
  const dao = getOrCreateDAO(Address.fromString(DAOAddress))
  if (dao.assetPool && dao.assetPool!.includes(event.params.to.toHex())) {
    log.info(
      'ERC20 Transfer To DAO Asset Pool. ERC20 {}, DAO {}, From {}, Asset Pool {}, Amount {}',
      [
        dataSource.address().toHex(),
        DAOAddress,
        event.params.from.toHex(),
        event.params.to.toHex(),
        event.params.value.toHex()
      ]
    )
    const daoBasicInfo = fetchDAOBasicValue(Address.fromString(dao.id))
    const poolAddress = event.params.to
    if (poolAddress) {
      let type = 'Frist'
      if (poolAddress == daoBasicInfo.asset2Address) {
        type = 'Second'
      }
      const txHash = event.transaction.hash
      const recordId = poolAddress.toHex().concat('-').concat(txHash.toHex())
      const record = AssetTxRecord.load(recordId)
      const assetAddress = record!.asset.split('-')[0]
      if (record) {
        log.info('ERC20 Transfer Match Asset Record. {}', [recordId])

        const from = Address.fromBytes(record.from)
        const to = Address.fromBytes(record.to)
        const tokenId = record.tokenId
        const pool = getOrCreateAssetPool(
          poolAddress,
          Address.fromString(DAOAddress),
          type
        )

        const asset = getOrCreateAsset(
          Address.fromString(assetAddress),
          pool,
          tokenId,
          to,
          event.block,
          event.transaction
        )

        if (dao.ledgerPool) {
          const ledgerPool = LedgerPool.load(dao.ledgerPool!)
          if (ledgerPool) {
            const amount = event.params.value

            const assetShellContract = AssetShellContract.bind(poolAddress)
            const lockedItem = assetShellContract.lockedOf(
              asset.tokenId,
              to,
              from
            )
            if (lockedItem && lockedItem.blockNumber != event.block.number) {
              const isEnableLock = assetShellContract.isEnableLock()
              if (!isEnableLock) {
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
                    erc20: dataSource.address()
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
                    source: event.transaction.to!,
                    amount,
                    price: amount.times(BigInt.fromI32(10_000)).div(pool.tax!),
                    type,
                    block: event.block,
                    erc20: dataSource.address()
                  }
                )

                log.info('ERC20 Transfer Asset Income. {}', [income!.id])
              }
            }
          }
        }
      }
    }
  }
}
