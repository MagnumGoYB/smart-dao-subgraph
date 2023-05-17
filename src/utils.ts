import { Address, Bytes, BigInt, log, ethereum } from '@graphprotocol/graph-ts'

import {
  Account,
  Asset,
  AssetOrder,
  AssetPool,
  DAO,
  Ledger,
  LedgerAssetIncome,
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
  fetchMemberValue,
  fetchVoteProposalValue
} from './fetch-contracts'

export * from './fetch-contracts'

export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)
export const ADDRESS_ZERO = Address.zero()
export class CreateLedgerParam {
  from: Address | null
  balance: BigInt | null
  name: string | null
  description: string | null
  to: Address | null
  member: BigInt | null
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
  const id = address.toHex()
  let assetPool = AssetPool.load(id)
  if (assetPool === null) {
    assetPool = new AssetPool(id)
    assetPool.host = DAOAddress.toHex()
    assetPool.total = ZERO_BI
    assetPool.totalSupply = ZERO_BI
    assetPool.amountTotal = ZERO_BI
    assetPool.minimumPriceTotal = ZERO_BI
    assetPool.orderTotal = ZERO_BI
    assetPool.orderAmountTotal = ZERO_BI
    assetPool.type = type
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
  dao.memberPool = memberPool.id
  dao.creator = DAOAddress.toHex().concat('-').concat(memberTokenId.toHex())
  dao.save()

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
    ledger.host = dao.id
    ledger.ledgerPool = ledgerPool.id
    ledger.address = address
    ledger.txHash = txHash
    ledger.blockId = block.hash.toHex()
    ledger.blockNumber = block.number
    ledger.blockTimestamp = block.timestamp
    ledger.type = 'Reserved'
    const t = type.toU32()
    const receive = BigInt.fromI32(1).toU32()
    const deposit = BigInt.fromI32(2).toU32()
    const withdraw = BigInt.fromI32(3).toU32()
    const release = BigInt.fromI32(4).toU32()
    const assetIncome = BigInt.fromI32(5).toU32()
    switch (t) {
      case receive:
        ledger.target = params.from
        ledger.balance = params.balance
        ledger.type = 'Receive'
        break
      case deposit:
        ledger.target = params.from
        ledger.balance = params.balance
        ledger.name = params.name
        ledger.description = params.description
        ledger.type = 'Deposit'
        break
      case withdraw:
        ledger.target = params.to
        ledger.balance = params.balance
        ledger.description = params.description
        ledger.type = 'Withdraw'
        break
      case release:
        ledger.target = params.to
        ledger.balance = params.balance
        ledger.member = params.member
        ledger.type = 'Release'
        break
      case assetIncome:
        ledger.target = params.to
        ledger.balance = params.balance
        ledger.type = 'AssetIncome'
        break
    }
    ledger.state = 'Enable' // default state is "Enable"
    ledger.save()
    log.info('New Ledger ID {}, Type {}', [id, type.toHex()])

    ledgerPool.count = ledgerPool.count.plus(ONE_BI)
    ledgerPool.save()
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
  const assetValues = fetchAssetShellValue(address, tokenId)
  const id = address.toHex().concat('-').concat(tokenId.toHex())
  const statistic = getOrCreateStatistic()
  let asset = Asset.load(id)
  if (asset === null) {
    asset = new Asset(id)
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
    order.from = tx.from
    order.to = tx.to ? tx.to! : ADDRESS_ZERO
    order.blockId = block.hash.toHex()
    order.blockNumber = block.number
    order.blockTimestamp = block.timestamp
    order.logIndex = logIndex
    order.save()
    log.info('Asset Order Created. ID {}', [id])
  }

  return order as AssetOrder
}

export function getOrCreateLedgerAssetIncome(
  pool: LedgerPool,
  ledger: Ledger,
  asset: Asset,
  source: Address,
  balance: BigInt,
  price: BigInt,
  saleType: BigInt,
  block: ethereum.Block,
  tx: ethereum.Transaction
): LedgerAssetIncome {
  const id = asset.id
    .concat('-')
    .concat(ledger.id)
    .concat('-')
    .concat(tx.hash.toHex())
  let income = LedgerAssetIncome.load(id)
  if (income === null) {
    income = new LedgerAssetIncome(id)
    income.host = asset.host
    income.asset = asset.id
    income.ledger = ledger.id
    income.ledgerPool = pool.id
    income.txHash = tx.hash
    income.from = tx.from
    income.to = tx.to ? tx.to! : ADDRESS_ZERO
    income.source = source
    income.balance = balance
    income.price = price
    income.blockId = block.hash.toHex()
    income.blockNumber = block.number
    income.blockTimestamp = block.timestamp
    const t = saleType.toU32()
    const kDefault = BigInt.fromI32(0).toU32()
    const kFirst = BigInt.fromI32(1).toU32()
    const kSecond = BigInt.fromI32(2).toU32()
    switch (t) {
      case kDefault:
        income.saleType = 'kDefault'
        break
      case kFirst:
        income.saleType = 'kFirst'
        break
      case kSecond:
        income.saleType = 'kSecond'
        break
    }
    income.save()
    log.info('Ledger Asset Income Created. ID {}', [id])
  }

  return income as LedgerAssetIncome
}

export function setExecutor(DAOAddress: Address, memberTokenId: BigInt): void {
  const id = DAOAddress.toHex().concat('-').concat(memberTokenId.toHex())
  const member = Member.load(id)
  if (member === null) {
    log.warning('DAO Set Executor. Member ID {} Not Found', [id])
    return
  }
  let dao = DAO.load(DAOAddress.toHex())
  if (dao === null) {
    log.warning('DAO Set Executor. DAO ID {} Not Found', [DAOAddress.toHex()])
    return
  }
  dao.executor = member.id
  dao.save()
  log.info('DAO Update Executor Success. Member ID {}', [member.id])
}
