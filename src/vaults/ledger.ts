import { Address, BigInt, dataSource, log } from '@graphprotocol/graph-ts'

import {
  Deposit as DepositEvent,
  Receive as ReceiveEvent,
  Release as ReleaseEvent,
  ReleaseLog as ReleaseLogEvent,
  Withdraw as WithdrawEvent
} from './../../generated/templates/LedgerInitializable/Ledger'
import { getOrCreateLedger, getOrUpdateLedgerBalance } from '../utils'

const context = dataSource.context()
const DAOAddress = context.getString('DAOAddress')

export function handleReceive(event: ReceiveEvent): void {
  log.info('DAO Ledger Receive. DAO {}, Address {}, From {}, Amount {}', [
    DAOAddress,
    dataSource.address().toHex(),
    event.params.from.toHex(),
    event.params.amount.toHex()
  ])

  getOrCreateLedger(
    BigInt.fromI32(1), // LedgerType = "0x1
    dataSource.address(),
    event.transaction.hash,
    Address.fromString(DAOAddress),
    event.block,
    {
      from: event.params.from,
      amount: event.params.amount,
      name: null,
      description: null,
      to: null,
      member: null,
      erc20: null
    }
  )
}

export function handleReleaseLog(event: ReleaseLogEvent): void {
  log.info(
    'DAO Ledger ReleaseLog. DAO {}, Address {}, Operator {}, ERC-20 {}, Amount {}',
    [
      DAOAddress,
      dataSource.address().toHex(),
      event.params.operator.toHex(),
      event.params.erc20.toHex(),
      event.params.amount.toHex()
    ]
  )
}

export function handleDeposit(event: DepositEvent): void {
  log.info('DAO Ledger Deposit. DAO {}, Address {}, From {}, Amount {}', [
    DAOAddress,
    dataSource.address().toHex(),
    event.params.from.toHex(),
    event.params.amount.toHex()
  ])

  getOrCreateLedger(
    BigInt.fromI32(2), // LedgerType = "0x2"
    dataSource.address(),
    event.transaction.hash,
    Address.fromString(DAOAddress),
    event.block,
    {
      from: event.params.from,
      amount: event.params.amount,
      name: event.params.name,
      description: event.params.description,
      to: null,
      member: null,
      erc20: null
    }
  )
}

export function handleWithdraw(event: WithdrawEvent): void {
  log.info(
    'DAO Ledger Withdraw. DAO {}, Address {}, Target {},  ERC-20 {}, Amount {}',
    [
      DAOAddress,
      dataSource.address().toHex(),
      event.params.target.toHex(),
      event.params.erc20.toHex(),
      event.params.amount.toHex()
    ]
  )

  const ledger = getOrCreateLedger(
    BigInt.fromI32(3), // LedgerType = "0x3"
    dataSource.address(),
    event.transaction.hash,
    Address.fromString(DAOAddress),
    event.block,
    {
      from: null,
      to: event.params.target,
      amount: event.params.amount,
      name: null,
      description: event.params.description,
      member: null,
      erc20: Address.zero().equals(event.params.erc20)
        ? null
        : event.params.erc20
    }
  )

  if (!Address.zero().equals(event.params.erc20)) {
    getOrUpdateLedgerBalance(
      ledger.id,
      event.params.erc20,
      BigInt.fromI32(0).minus(event.params.amount),
      event.block
    )
  }
}

export function handleRelease(event: ReleaseEvent): void {
  log.info(
    'DAO Ledger Release. DAO {}, Address {}, Member {}, To {}, ERC-20 {}, Amount {}',
    [
      DAOAddress,
      dataSource.address().toHex(),
      event.params.member.toHex(),
      event.params.to.toHex(),
      event.params.erc20.toHex(),
      event.params.amount.toHex()
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
      amount: event.params.amount,
      member: event.params.member,
      name: null,
      description: null,
      erc20: Address.zero().equals(event.params.erc20)
        ? null
        : event.params.erc20
    }
  )
}
