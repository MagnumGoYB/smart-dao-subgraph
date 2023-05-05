import { Address, Bytes, BigInt, log, ethereum } from '@graphprotocol/graph-ts'

import {
  Account,
  DAO,
  Ledger,
  Member,
  MemberInfo,
  Proposal,
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

export function getOrCreateDAO(address: Address): DAO {
  const id = address.toHex()
  let dao = DAO.load(id)
  if (dao === null) {
    dao = new DAO(id)
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
  }
  return account as Account
}

export function getOrCreateMember(
  accountAddress: Address,
  DAOAddress: Address,
  memberTokenId: BigInt,
  memberInfoAddress: Address
): Member {
  const memberInfoId = memberInfoAddress.toHex()
  const memberValues = fetchMemberValue(memberInfoAddress, memberTokenId)
  let memberInfo = MemberInfo.load(memberInfoId)
  let dao = getOrCreateDAO(DAOAddress)
  if (memberInfo === null) {
    memberInfo = new MemberInfo(memberInfoId)
    memberInfo.dao = DAOAddress.toHex()
    memberInfo.name = memberValues.baseName
    memberInfo.count = ZERO_BI
    memberInfo.save()

    dao.memberInfo = memberInfo.id
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

export function getOrCreateVotePoolProposal(
  id: BigInt,
  address: Address,
  DAOAddress: Address,
  block: ethereum.Block
): Proposal {
  const dao = getOrCreateDAO(DAOAddress)
  const votePoolId = address.toHex()
  log.debug('Create Vote Pool ID {}', [votePoolId])

  let votePool = VotePool.load(votePoolId)
  if (votePool === null) {
    votePool = new VotePool(votePoolId)
    votePool.dao = dao.id
    votePool.count = ZERO_BI
    votePool.save()

    dao.votePool = votePool.id
    dao.save()
    log.info('Vote Pool Created. ID {}', [votePoolId])
  }

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
  const ledgerId = address.toHex().concat('-').concat(txHash.toHex()) // address.concat('-').concat(txHash)
  const dao = getOrCreateDAO(DAOAddress)
  let ledger = Ledger.load(ledgerId)
  if (ledger === null) {
    ledger = new Ledger(ledgerId)
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
    log.info('New Ledger ID {}, Type {}', [ledgerId, type.toHex()])
  }
  return ledger as Ledger
}
