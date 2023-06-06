import {
  Address,
  Bytes,
  BigInt,
  log,
  ethereum,
  json
} from '@graphprotocol/graph-ts'

import {
  Account,
  Asset,
  AssetOrder,
  AssetPool,
  AssetTxRecord,
  DAO,
  Ledger,
  LedgerAssetIncome,
  LedgerBalance,
  LedgerPool,
  Member,
  MemberPool,
  Proposal,
  Statistic,
  Vote,
  VotePool
} from '../generated/schema'
import {
  fetchAssetShellValue,
  fetchAssetValue,
  fetchERC20,
  fetchMemberPoolValue,
  fetchMemberValue,
  fetchVotePoolValue,
  fetchVoteProposalValue
} from './fetch-contracts'

export * from './fetch-contracts'

export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)
export const ADDRESS_ZERO = Address.zero()
export class CreateLedgerParam {
  from: Address | null
  amount: BigInt | null
  name: string | null
  description: string | null
  to: Address | null
  member: BigInt | null
  erc20: Address | null
}

export class LedgerAssetIncomeCreateData {
  from: Address
  to: Address
  source: Address
  amount: BigInt
  price: BigInt
  type: string
  erc20: Address | null
  block: ethereum.Block
}

export function getOrCreateStatistic(): Statistic {
  const id = ADDRESS_ZERO.toHex()
  let statistic = Statistic.load(id)
  if (statistic === null) {
    statistic = new Statistic(id)
    statistic.totalDAOs = ZERO_BI
    statistic.totalMembers = ZERO_BI
    statistic.totalAccounts = ZERO_BI
    statistic.totalProposals = ZERO_BI
    statistic.totalAssets = ZERO_BI
    statistic.totalDestroyedAssets = ZERO_BI
    statistic.totalAssetsAmount = ZERO_BI
    statistic.totalDestroyedAssetsAmount = ZERO_BI
    statistic.totalAssetsMinimumPrice = ZERO_BI
    statistic.totalAssetsOrder = ZERO_BI
    statistic.totalAssetsOrderAmount = ZERO_BI
    statistic.totalLedgerAssetIncome = ZERO_BI
    statistic.totalLedgerAssetIncomeAmount = ZERO_BI
    statistic.totalAgreedProposals = ZERO_BI
    statistic.totalClosedProposals = ZERO_BI
    statistic.totalExecutedProposals = ZERO_BI
    statistic.totalVotes = ZERO_BI
  }
  return statistic as Statistic
}

export function getOrCreateDAO(address: Address): DAO {
  const id = address.toHex()
  let dao = DAO.load(id)
  if (dao === null) {
    dao = new DAO(id)

    const statistic = getOrCreateStatistic()
    statistic.totalDAOs = statistic.totalDAOs.plus(ONE_BI)
    statistic.save()
  }
  return dao as DAO
}

export function getOrCreateAccount(address: Address): Account {
  const id = address.toHex()
  let account = Account.load(id)
  if (account === null) {
    account = new Account(id)
    account.save()
    log.info('New Account. ID {}', [id])

    const statistic = getOrCreateStatistic()
    statistic.totalAccounts = statistic.totalAccounts.plus(ONE_BI)
    statistic.save()
  }
  return account as Account
}

export function getOrCreateMemberPool(
  memberPoolAddress: Address,
  DAOAddress: Address
): MemberPool {
  const id = memberPoolAddress.toHex()
  let memberPool = MemberPool.load(id)
  if (memberPool === null) {
    memberPool = new MemberPool(id)
    memberPool.host = DAOAddress.toHex()
    memberPool.count = ZERO_BI
    memberPool.save()
  }

  return memberPool as MemberPool
}

export function getOrCreateVotePool(
  address: Address,
  DAOAddress: Address
): VotePool {
  const poolContract = fetchVotePoolValue(address)
  const id = address.toHex()
  let votePool = VotePool.load(id)
  if (votePool === null) {
    votePool = new VotePool(id)
    votePool.host = DAOAddress.toHex()
    votePool.votedTotal = ZERO_BI
    votePool.proposalTotal = ZERO_BI
    votePool.proposalAgreedTotal = ZERO_BI
    votePool.proposalClosedTotal = ZERO_BI
    votePool.proposalExecutedTotal = ZERO_BI
    votePool.lifespan = poolContract.lifespan
    votePool.save()
    log.info('Vote Pool Created. ID {}', [id])
  }
  return votePool as VotePool
}

export function getOrCreateLedgerPool(
  address: Address,
  DAOAddress: Address
): LedgerPool {
  const id = address.toHex()
  let ledgerPool = LedgerPool.load(id)
  if (ledgerPool === null) {
    ledgerPool = new LedgerPool(id)
    ledgerPool.host = DAOAddress.toHex()
    ledgerPool.count = ZERO_BI
    ledgerPool.assetIncomeAmount = ZERO_BI
    ledgerPool.assetIncomeTotal = ZERO_BI
    ledgerPool.save()
    log.info('Ledger Pool Created. ID {}', [id])
  }
  return ledgerPool as LedgerPool
}

export function getOrCreateAssetPool(
  address: Address,
  DAOAddress: Address,
  type: string
): AssetPool {
  const assetContract = fetchAssetShellValue(address)
  const id = address.toHex()
  let assetPool = AssetPool.load(id)
  if (assetPool === null && type) {
    assetPool = new AssetPool(id)
    assetPool.host = DAOAddress.toHex()
    assetPool.total = ZERO_BI
    assetPool.totalSupply = ZERO_BI
    assetPool.amountTotal = ZERO_BI
    assetPool.minimumPriceTotal = ZERO_BI
    assetPool.orderTotal = ZERO_BI
    assetPool.orderAmountTotal = ZERO_BI
    assetPool.type = type
    assetPool.tax = assetContract.sellerFeeBasisPoints
    assetPool.save()
    log.info('Asset Pool Created. ID {}', [id])
  }
  return assetPool as AssetPool
}

export function getOrCreateMember(
  accountAddress: Address,
  DAOAddress: Address,
  memberTokenId: BigInt,
  memberPoolAddress: Address
): Member {
  const memberValues = fetchMemberValue(memberPoolAddress, memberTokenId)
  let memberPool = getOrCreateMemberPool(memberPoolAddress, DAOAddress)
  memberPool.name = memberValues.baseName
  memberPool.save()

  let dao = getOrCreateDAO(DAOAddress)
  if (dao.creator === null) {
    dao.memberPool = memberPool.id
    dao.creator = DAOAddress.toHex().concat('-').concat(memberTokenId.toHex())
    dao.save()
  }

  const account = getOrCreateAccount(accountAddress)
  dao.accounts = dao.accounts.concat([account.id])
  dao.save()

  const id = DAOAddress.toHex().concat('-').concat(memberTokenId.toHex())
  log.debug('Member ID {}', [id])
  let member = Member.load(id)
  if (member === null) {
    member = new Member(id)
    member.owner = account.id
    member.token = memberPoolAddress
    member.tokenId = memberTokenId
    member.description = memberValues.description
    member.name = memberValues.name
    member.image = memberValues.image
    member.memberPool = memberPool.id
    member.votes = memberValues.votes
    member.host = DAOAddress.toHex()
    member.save()

    memberPool.count = memberPool.count.plus(ONE_BI)
    memberPool.save()

    const statistic = getOrCreateStatistic()
    statistic.totalMembers = statistic.totalMembers.plus(ONE_BI)
    statistic.save()
  }
  return member as Member
}

export function getOrCreateVoteProposal(
  id: BigInt,
  pool: VotePool,
  address: Address,
  DAOAddress: Address,
  block: ethereum.Block
): Proposal {
  const proposalId = DAOAddress.toHex().concat('-').concat(id.toHex())
  const info = fetchVoteProposalValue(id, address, DAOAddress)
  let voteProposal = Proposal.load(proposalId)
  if (voteProposal === null) {
    voteProposal = new Proposal(proposalId)
    voteProposal.number = 0
    voteProposal.host = DAOAddress.toHex()
    voteProposal.votePool = pool.id
    voteProposal.name = info.name
    voteProposal.description = info.description
    voteProposal.isAnonymous = info.isAnonymous
    if (info.isAnonymous) {
      voteProposal.origin = null
    } else {
      voteProposal.origin = info.origin
    }
    voteProposal.originAddress = info.originAddress
    voteProposal.lifespan = info.lifespan
    voteProposal.expiry = info.expiry
    voteProposal.target = info.target.map<Bytes>((target: Bytes) => target)
    voteProposal.data = info.data
    voteProposal.passRate = info.passRate
    voteProposal.blockId = block.hash.toHex()
    voteProposal.blockNumber = block.number
    voteProposal.blockTimestamp = block.timestamp
    log.info('Vote Proposal Created. ID {}', [proposalId])
  } else {
    voteProposal.loopCount = info.loopCount
    voteProposal.loopTime = info.loopTime
    voteProposal.voteTotal = info.voteTotal
    voteProposal.agreeTotal = info.agreeTotal
    voteProposal.executeTime = info.executeTime
    voteProposal.isAgree = info.isAgree
    voteProposal.isClose = info.isClose
    voteProposal.isExecuted = info.isExecuted
    voteProposal.modifyTime = block.timestamp
    log.info('Vote Proposal Update. ID {}', [proposalId])
  }
  voteProposal.save()

  return voteProposal as Proposal
}

export function getOrCreateVote(
  pool: VotePool,
  proposal: Proposal,
  memberTokenId: BigInt,
  votes: BigInt,
  block: ethereum.Block,
  tx: ethereum.Transaction
): Vote {
  const id = proposal.id.concat('-').concat(tx.hash.toHex())
  let vote = Vote.load(id)
  if (vote === null) {
    vote = new Vote(id)
    vote.host = pool.host
    vote.proposal = proposal.id
    vote.votePool = pool.id
    vote.blockId = block.hash.toHex()
    vote.blockNumber = block.number
    vote.blockTimestamp = block.timestamp
    vote.owner = pool.host.concat('-').concat(memberTokenId.toHex())
    vote.votes = votes
    vote.save()

    if (proposal.isAgree) {
      pool.proposalAgreedTotal = pool.proposalAgreedTotal.plus(ONE_BI)
      pool.save()

      const statistic = getOrCreateStatistic()
      statistic.totalAgreedProposals =
        statistic.totalAgreedProposals.plus(ONE_BI)
      statistic.save()
    }
  }
  return vote as Vote
}

/**
 * @export
 * @param {string} type Reserved = 0x0, Receive = 0x1, Deposit = 0x2, Withdraw = 0x3, Release = 0x4, AssetIncome = 0x5
 * @param {Address} address
 * @param {Bytes} txHash
 * @param {Address} DAOAddress
 * @param {ethereum.Block} block
 * @param {CreateLedgerParam} params
 * @return {*}  {Ledger}
 */
export function getOrCreateLedger(
  type: BigInt,
  address: Address,
  txHash: Bytes,
  DAOAddress: Address,
  block: ethereum.Block,
  params: CreateLedgerParam
): Ledger {
  const id = address.toHex().concat('-').concat(txHash.toHex()) // address.concat('-').concat(txHash)
  const dao = getOrCreateDAO(DAOAddress)

  const ledgerPool = getOrCreateLedgerPool(address, DAOAddress)
  dao.ledgerPool = ledgerPool.id
  dao.save()

  let ledger = Ledger.load(id)
  if (ledger === null) {
    ledger = new Ledger(id)
    const t = type.toU32()
    const receive = BigInt.fromI32(1).toU32()
    const deposit = BigInt.fromI32(2).toU32()
    const withdraw = BigInt.fromI32(3).toU32()
    const release = BigInt.fromI32(4).toU32()
    const assetIncome = BigInt.fromI32(5).toU32()
    switch (t) {
      case receive:
        ledger.target = params.from
        ledger.amount = params.amount
        ledger.ref = params.from
        ledger.type = 'Receive'
        break
      case deposit:
        ledger.target = params.from
        ledger.amount = params.amount
        ledger.name = params.name
        ledger.description = params.description
        ledger.ref = params.from
        ledger.type = 'Deposit'
        break
      case withdraw:
        ledger.target = params.to
        ledger.amount = params.amount
        ledger.description = params.description
        ledger.ref = params.to
        ledger.type = 'Withdraw'
        break
      case release:
        ledger.target = params.to
        ledger.amount = params.amount
        ledger.member = params.member
        ledger.ref = params.to
        ledger.type = 'Release'
        break
      case assetIncome:
        ledger.target = params.to
        ledger.ref = params.from
        ledger.amount = params.amount
        ledger.type = 'AssetIncome'
        break
    }
    switch (t) {
      case receive:
      case deposit:
      case withdraw:
      case release:
      case assetIncome:
        ledger.host = dao.id
        ledger.ledgerPool = ledgerPool.id
        ledger.address = address
        ledger.txHash = txHash
        ledger.blockId = block.hash.toHex()
        ledger.blockNumber = block.number
        ledger.blockTimestamp = block.timestamp
        ledger.state = 'Enable'
        if (params.erc20 !== null) {
          ledger.erc20 = params.erc20
          const erc20 = fetchERC20(params.erc20!)
          ledger.symbol = erc20.symbol
        }

        ledger.save()
        log.info('New Ledger ID {}, Type {}', [id, type.toHex()])

        ledgerPool.count = ledgerPool.count.plus(ONE_BI)
        ledgerPool.save()
        break
    }
  }
  return ledger as Ledger
}

export function getOrCreateAsset(
  address: Address,
  pool: AssetPool,
  tokenId: BigInt,
  to: Address,
  block: ethereum.Block,
  tx: ethereum.Transaction
): Asset {
  const assetValues = fetchAssetValue(address, tokenId)
  const id = address.toHex().concat('-').concat(tokenId.toHex())
  const statistic = getOrCreateStatistic()
  let asset = Asset.load(id)
  if (asset === null) {
    asset = new Asset(id)
    asset.listed = false
    asset.host = pool.host
    asset.token = address
    asset.tokenId = tokenId
    asset.totalSupply = assetValues.totalSupply
    asset.uri = assetValues.uri
    asset.blockId = block.hash.toHex()
    asset.blockNumber = block.number
    asset.blockTimestamp = block.timestamp
    asset.assetPool = pool.id
    asset.author = to.toHex()
    asset.owner = to.toHex()
    asset.selling = 'UnsellOrUnknown'
    asset.sellPrice = tx.value
    asset.state = 'Enable'
    asset.minimumPrice = assetValues.minimumPrice
    asset.assetType = tokenId.mod(BigInt.fromI32(2))
      ? 'ERC1155'
      : 'ERC1155_Single'
    asset.destroyed = false
    asset.save()

    log.info('Asset Created. ID {}', [id])

    pool.total = pool.total.plus(ONE_BI)
    pool.totalSupply = pool.totalSupply.plus(assetValues.totalSupply)
    pool.amountTotal = pool.amountTotal.plus(tx.value)
    pool.minimumPriceTotal = pool.minimumPriceTotal.plus(
      assetValues.minimumPrice
    )
    pool.save()

    log.debug(
      'Asset Pool Update. ID {}, Total {}, Total Supply {}, Amount {}',
      [
        pool.id,
        pool.total.toHex(),
        pool.totalSupply.toHex(),
        pool.amountTotal.toHex()
      ]
    )

    statistic.totalAssets = statistic.totalAssets.plus(ONE_BI)
    statistic.totalAssetsAmount = statistic.totalAssetsAmount.plus(tx.value)
    statistic.totalAssetsMinimumPrice = statistic.totalAssetsMinimumPrice.plus(
      assetValues.minimumPrice
    )
    statistic.save()
  }
  return asset as Asset
}

export function getOrCreateAssetOrder(
  pool: AssetPool,
  asset: Asset,
  from: Address,
  to: Address,
  block: ethereum.Block,
  tx: ethereum.Transaction,
  logIndex: BigInt
): AssetOrder {
  const id = asset.id.concat('-').concat(tx.hash.toHex())
  let order = AssetOrder.load(id)
  if (order === null) {
    order = new AssetOrder(id)
    order.host = asset.host
    order.asset = asset.id
    order.assetPool = pool.id
    order.txHash = tx.hash
    order.value = tx.value
    order.from = from
    order.to = to
    order.blockId = block.hash.toHex()
    order.blockNumber = block.number
    order.blockTimestamp = block.timestamp
    order.logIndex = logIndex
    order.save()
    log.info('Asset Order Created. ID {}', [id])

    pool.orderTotal = pool.orderTotal.plus(ONE_BI)
    pool.orderAmountTotal = pool.orderAmountTotal.plus(tx.value)
    pool.save()
  }

  return order as AssetOrder
}

export function getOrCreateLedgerAssetIncome(
  pool: LedgerPool,
  ledger: Ledger,
  asset: Asset,
  tx: ethereum.Transaction,
  createData?: LedgerAssetIncomeCreateData
): LedgerAssetIncome | null {
  const id = asset.id
    .concat('-')
    .concat(ledger.id)
    .concat('-')
    .concat(tx.hash.toHex())
  let income = LedgerAssetIncome.load(id)
  if (income === null && createData) {
    income = new LedgerAssetIncome(id)
    income.host = asset.host
    income.asset = asset.id
    income.ledger = ledger.id
    income.ledgerPool = pool.id
    income.txHash = tx.hash
    income.from = createData.from
    income.to = createData.to
    income.source = createData.source
    income.amount = createData.amount
    income.price = createData.price
    income.blockId = createData.block.hash.toHex()
    income.blockNumber = createData.block.number
    income.blockTimestamp = createData.block.timestamp
    income.saleType = createData.type
    if (createData.erc20) {
      const erc20Values = fetchERC20(createData.erc20!)
      income.erc20 = createData.erc20
      income.symbol = erc20Values.symbol
    }
    income.save()
    log.info('Ledger Asset Income Created. ID {}', [id])
    return income as LedgerAssetIncome
  }
  return null
}

export function getOrUpdateLedgerBalance(
  ledgerId: string,
  erc20: Address,
  amount?: BigInt,
  block?: ethereum.Block
): LedgerBalance | null {
  const ledger = Ledger.load(ledgerId)
  if (ledger !== null) {
    const id = ledgerId.concat('-').concat(erc20.toHex())
    const erc20Values = fetchERC20(erc20)
    let ledgerBalance = LedgerBalance.load(id)
    if (ledgerBalance === null && amount && block) {
      ledgerBalance = new LedgerBalance(id)
      ledgerBalance.erc20 = erc20
      ledgerBalance.ledger = ledger.id
      ledgerBalance.host = ledger.host
      ledgerBalance.symbol = erc20Values.symbol
      ledgerBalance.name = erc20Values.name
      ledgerBalance.time = block.timestamp
      ledgerBalance.items = BigInt.fromI32(1)
      ledgerBalance.value = amount
      if (amount < BigInt.fromI32(0)) {
        ledgerBalance.expenditure = amount
      } else {
        ledgerBalance.income = amount
      }
      ledgerBalance.save()
    } else if (ledgerBalance !== null && amount && block) {
      ledgerBalance.time = block.timestamp
      ledgerBalance.items = ledgerBalance.items.plus(ONE_BI)
      ledgerBalance.value = ledgerBalance.value.plus(amount)
      if (amount < BigInt.fromI32(0)) {
        ledgerBalance.expenditure = ledgerBalance.expenditure!.minus(amount)
      } else {
        ledgerBalance.income = ledgerBalance.income!.plus(amount)
      }
      ledgerBalance.save()
    }
    return ledgerBalance as LedgerBalance
  }
  return null
}

export function getOrCreateAssetTxRecord(
  address: Address,
  tokenId: BigInt,
  tx: ethereum.Transaction,
  block?: ethereum.Block,
  from?: Address,
  to?: Address
): AssetTxRecord | null {
  // "ID (hash) - (Asset Address).concat('-').concat(tokenId).concat('-').concat(txHash)"
  const assetId = address.toHex().concat('-').concat(tokenId.toHex())
  const asset = Asset.load(assetId)
  if (asset !== null) {
    const id = address.toHex().concat('-').concat(tx.hash.toHex())
    let record = AssetTxRecord.load(id)
    if (record === null && block && from && to) {
      record = new AssetTxRecord(id)
      record.asset = asset.id
      record.host = asset.host
      record.assetPool = asset.assetPool
      record.txHash = tx.hash
      record.token = address
      record.tokenId = tokenId
      record.blockId = block.hash.toHex()
      record.blockNumber = block.number
      record.value = tx.value
      record.from = from
      record.to = to
      record.save()
    } else if (record !== null && !block) {
    }
    return record as AssetTxRecord
  }
  return null
}

export function setExecutor(DAOAddress: Address): void {
  const dao = DAO.load(DAOAddress.toHex())
  if (dao === null) {
    log.warning('DAO Set Executor. DAO ID {} Not Found', [DAOAddress.toHex()])
    return
  }
  const poolContract = fetchMemberPoolValue(Address.fromString(dao.memberPool!))
  dao.executor = poolContract.executor.toHex()
  dao.save()
  log.info('DAO Update Executor Success. {}', [dao.executor!])
}
