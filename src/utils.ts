import { Address, Bytes, BigInt, log, ethereum } from '@graphprotocol/graph-ts'

import {
  Account,
  AssetPool,
  DAO,
  Ledger,
  LedgerPool,
  Member,
  MemberInfo,
  Proposal,
  Statistic,
  VotePool
} from '../generated/schema'
import { fetchMemberValue, fetchVoteProposalValue } from './fetch-contracts'

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

export function getOrCreateMemberInfo(
  memberInfoAddress: Address,
  DAOAddress: Address
): MemberInfo {
  const id = memberInfoAddress.toHex()
  let memberInfo = MemberInfo.load(id)
  if (memberInfo === null) {
    memberInfo = new MemberInfo(id)
    memberInfo.dao = DAOAddress.toHex()
    memberInfo.count = ZERO_BI
    memberInfo.save()
  }

  return memberInfo as MemberInfo
}

export function getOrCreateMember(
  accountAddress: Address,
  DAOAddress: Address,
  memberTokenId: BigInt,
  memberInfoAddress: Address
): Member {
  const memberValues = fetchMemberValue(memberInfoAddress, memberTokenId)

  let memberInfo = getOrCreateMemberInfo(memberInfoAddress, DAOAddress)
  memberInfo.name = memberValues.baseName
  memberInfo.save()

  let dao = getOrCreateDAO(DAOAddress)
  dao.memberInfo = memberInfo.id
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
    member.account = account.id
    member.tokenId = memberTokenId
    member.description = memberValues.description
    member.name = memberValues.name
    member.image = memberValues.image
    member.infoBy = memberInfo.id
    member.votes = memberValues.votes
    member.save()

    memberInfo.count = memberInfo.count.plus(ONE_BI)
    memberInfo.save()

    const statistic = getOrCreateStatistic()
    statistic.totalMembers = statistic.totalMembers.plus(ONE_BI)
    statistic.save()
  }
  return member as Member
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

export function getOrCreateVotePool(
  address: Address,
  DAOAddress: Address
): VotePool {
  const id = address.toHex()
  let votePool = VotePool.load(id)
  if (votePool === null) {
    votePool = new VotePool(id)
    votePool.dao = DAOAddress.toHex()
    votePool.count = ZERO_BI
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
    ledgerPool.dao = DAOAddress.toHex()
    ledgerPool.count = ZERO_BI
    ledgerPool.save()
    log.info('Ledger Pool Created. ID {}', [id])
  }
  return ledgerPool as LedgerPool
}

export function getOrCreateAssetPool(
  address: Address,
  DAOAddress: Address
): AssetPool {
  const id = address.toHex()
  let assetPool = AssetPool.load(id)
  if (assetPool === null) {
    assetPool = new AssetPool(id)
    assetPool.dao = DAOAddress.toHex()
    assetPool.count = ZERO_BI
    assetPool.save()
    log.info('Asset Pool Created. ID {}', [id])
  }
  return assetPool as AssetPool
}

export function getOrCreateVotePoolProposal(
  id: BigInt,
  address: Address,
  DAOAddress: Address,
  block: ethereum.Block
): Proposal {
  const dao = getOrCreateDAO(DAOAddress)
  const votePool = getOrCreateVotePool(address, DAOAddress)
  dao.votePool = votePool.id
  dao.save()

  const proposalId = id.toHex()
  let voteProposal = Proposal.load(proposalId)
  if (voteProposal === null) {
    voteProposal = new Proposal(proposalId)
    voteProposal.votePool = votePool.id
    const info = fetchVoteProposalValue(id, address, DAOAddress)
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
    voteProposal.loopCount = info.loopCount
    voteProposal.loopTime = info.loopTime
    voteProposal.voteTotal = info.voteTotal
    voteProposal.agreeTotal = info.agreeTotal
    voteProposal.executeTime = info.executeTime
    voteProposal.isAgree = info.isAgree
    voteProposal.isClose = info.isClose
    voteProposal.isExecuted = info.isExecuted
    voteProposal.time = block.timestamp
    voteProposal.modifyTime = block.timestamp
    voteProposal.blockId = block.hash.toHex()
    voteProposal.blockNumber = block.number
    voteProposal.blockTimestamp = block.timestamp
    voteProposal.save()
    log.info('Vote Proposal Created. ID {}', [proposalId])

    votePool.count = votePool.count.plus(ONE_BI)
    votePool.save()

    const statistic = getOrCreateStatistic()
    statistic.totalProposals = statistic.totalProposals.plus(ONE_BI)
    statistic.save()
  }

  return voteProposal as Proposal
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
    ledger.dao = dao.id
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
