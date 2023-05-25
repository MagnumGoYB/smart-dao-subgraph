import { Address, BigInt, dataSource, log } from '@graphprotocol/graph-ts'

import { Asset } from '../../generated/schema'
import {
  AssetIncome as AssetIncomeEvent,
  Deposit as DepositEvent,
  Receive as ReceiveEvent,
  Release as ReleaseEvent,
  ReleaseLog as ReleaseLogEvent,
  Withdraw as WithdrawEvent
} from './../../generated/templates/LedgerInitializable/Ledger'
import {
  ONE_BI,
  getOrCreateDAO,
  getOrCreateLedger,
  getOrCreateLedgerAssetIncome,
  getOrCreateLedgerPool,
  getOrCreateStatistic
} from '../utils'

const context = dataSource.context()
const DAOAddress = context.getString('DAOAddress')

export function handleReceive(event: ReceiveEvent): void {
  log.info('DAO Ledger Receive. DAO {}, Address {}, From {}, Balance {}', [
    DAOAddress,
    dataSource.address().toHex(),
    event.params.from.toHex(),
    event.params.balance.toHex()
  ])

  getOrCreateLedger(
    BigInt.fromI32(1), // LedgerType = "0x1
    dataSource.address(),
    event.transaction.hash,
    Address.fromString(DAOAddress),
    event.block,
    {
      from: event.params.from,
      balance: event.params.balance,
      name: null,
      description: null,
      to: null,
      member: null
    }
  )
}

export function handleReleaseLog(event: ReleaseLogEvent): void {
  log.info(
    'DAO Ledger ReleaseLog. DAO {}, Address {}, Operator {}, Balance {}',
    [
      DAOAddress,
      dataSource.address().toHex(),
      event.params.operator.toHex(),
      event.params.balance.toHex()
    ]
  )
}

export function handleDeposit(event: DepositEvent): void {
  log.info('DAO Ledger Deposit. DAO {}, Address {}, From {}, Balance {}', [
    DAOAddress,
    dataSource.address().toHex(),
    event.params.from.toHex(),
    event.params.balance.toHex()
  ])

  getOrCreateLedger(
    BigInt.fromI32(2), // LedgerType = "0x2"
    dataSource.address(),
    event.transaction.hash,
    Address.fromString(DAOAddress),
    event.block,
    {
      from: event.params.from,
      balance: event.params.balance,
      name: event.params.name,
      description: event.params.description,
      to: null,
      member: null
    }
  )
}

export function handleWithdraw(event: WithdrawEvent): void {
  log.info('DAO Ledger Withdraw. DAO {}, Address {}, Target {}, Balance {}', [
    DAOAddress,
    dataSource.address().toHex(),
    event.params.target.toHex(),
    event.params.balance.toHex()
  ])

  getOrCreateLedger(
    BigInt.fromI32(3), // LedgerType = "0x3"
    dataSource.address(),
    event.transaction.hash,
    Address.fromString(DAOAddress),
    event.block,
    {
      from: null,
      to: event.params.target,
      balance: event.params.balance,
      name: null,
      description: event.params.description,
      member: null
    }
  )
}

export function handleRelease(event: ReleaseEvent): void {
  log.info(
    'DAO Ledger Release. DAO {}, Address {}, Member {}, To {}, Balance {}',
    [
      DAOAddress,
      dataSource.address().toHex(),
      event.params.member.toHex(),
      event.params.to.toHex(),
      event.params.balance.toHex()
    ]
  )

  getOrCreateLedger(
    BigInt.fromI32(4), // LedgerType = "0x4"
    dataSource.address(),
    event.transaction.hash,
    Address.fromString(DAOAddress),
    event.block,
    {
      from: null,
      to: event.params.to,
      balance: event.params.balance,
      member: event.params.member,
      name: null,
      description: null
    }
  )
}

export function handleAssetIncome(event: AssetIncomeEvent): void {
  log.info(
    'DAO Ledger AssetIncome. DAO {}, Address {}, Token {}, TokenId {}, Source {}, To {}, Balance {}, Price {}',
    [
      DAOAddress,
      dataSource.address().toHex(),
      event.params.token.toHex(),
      event.params.tokenId.toHex(),
      event.params.source.toHex(),
      event.params.to.toHex(),
      event.params.balance.toHex(),
      event.params.price.toHex()
    ]
  )
  const statistic = getOrCreateStatistic()
  const ledger = getOrCreateLedger(
    BigInt.fromI32(5), // LedgerType = "0x5"
    dataSource.address(),
    event.transaction.hash,
    Address.fromString(DAOAddress),
    event.block,
    {
      from: event.params.from,
      to: event.params.source,
      balance: event.params.balance,
      member: null,
      name: null,
      description: null
    }
  )
  const ledgerPool = getOrCreateLedgerPool(
    Address.fromString(ledger.ledgerPool),
    Address.fromString(DAOAddress)
  )

  const dao = getOrCreateDAO(Address.fromString(DAOAddress))
  if (dao.assetPool) {
    for (let i = 0; i < dao.assetPool!.length; i++) {
      const pool = dao.assetPool![i]
      const id = pool.concat('-').concat(event.params.tokenId.toHex())
      const asset = Asset.load(id)
      if (asset !== null && ledgerPool !== null) {
        getOrCreateLedgerAssetIncome(
          ledgerPool,
          ledger,
          asset,
          event.params.source,
          event.params.balance,
          event.params.price,
          BigInt.fromI32(event.params.saleType),
          event.block,
          event.transaction
        )

        statistic.totalLedgerAssetIncome =
          statistic.totalLedgerAssetIncome.plus(ONE_BI)
        statistic.totalLedgerAssetIncomeAmount =
          statistic.totalLedgerAssetIncomeAmount.plus(event.params.balance)
        statistic.save()

        ledgerPool.assetIncomeTotal = ledgerPool.assetIncomeTotal.plus(ONE_BI)
        ledgerPool.assetIncomeAmount = ledgerPool.assetIncomeAmount.plus(
          event.params.balance
        )
        ledgerPool.save()

        asset.soldTime = event.block.timestamp
        asset.selling = 'UnsellOrUnknown'
        asset.save()
      }
    }
  }
}
