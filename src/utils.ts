import {
  Address,
  Bytes,
  BigInt,
  log,
  ByteArray,
  ethereum
} from '@graphprotocol/graph-ts'

import {
  Account,
  DAO,
  Ledger,
  Member,
  Proposal,
  VotePool
} from '../generated/schema'
import { DAO as DAOContract } from '../generated/templates/DAOInitializable/DAO'
import { Member as MemberContract } from '../generated/templates/MemberInitializable/Member'
import { VotePool as VotePoolContract } from '../generated/templates/VotePoolInitializable/VotePool'

export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)
export const ADDRESS_ZERO = Address.zero()

export class DAOPrimaryInfo {
  name: string
  description: string
  mission: string
  image: string
  extend: Bytes | null
  memberAddress: Address
  votePoolAddress: Address
  operatorAddress: Address
  ledgerAddress: Address
}

export class MemberInfo {
  name: string | null
  description: string | null
  image: string | null
  votes: BigInt
}

export class ProposalInfo {
  isAnonymous: boolean
  origin: Address
  name: string | null
  description: string | null
  lifespan: BigInt | null
  expiry: BigInt | null
}

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

export function getOrCreateAccount(
  address: Address,
  DAOAddress: Address,
  memberAddress: Address,
  tokenId: BigInt
): Account {
  const id = address.toHex()
  const accountId = DAOAddress.toHex().concat('-').concat(id)
  log.debug('Account ID {}', [accountId])
  let account = Account.load(accountId)
  if (account === null) {
    account = new Account(accountId)
    account.address = address
  }
  log.debug('Get Member ID {}', [tokenId.toString()])
  const info = fetchMemberValue(memberAddress, tokenId)
  account.name = info.name
  account.description = info.description
  account.image = info.image
  account.votes = info.votes
  account.save()
  return account as Account
}

export function getOrCreateMember(
  tokenId: BigInt,
  memberAddress: Address,
  accountAddress: Address,
  DAOAddress: Address
): Member {
  const memberId = memberAddress.toHex().concat('-').concat(tokenId.toHex())
  log.debug('Member ID {}', [memberId])
  const dao = getOrCreateDAO(DAOAddress)
  const account = getOrCreateAccount(
    accountAddress,
    DAOAddress,
    memberAddress,
    tokenId
  )
  log.debug('Member Account ID {}', [account.id])
  let member = Member.load(memberId)
  if (member === null) {
    member = new Member(memberId)
    member.dao = dao.id
    member.account = account.id
    member.address = memberAddress
    member.save()
  }
  return member as Member
}

export function fetchDAOBasicValue(address: Address): DAOPrimaryInfo {
  const contract = DAOContract.bind(address)
  const nameResult = contract.try_name()
  const descriptionResult = contract.try_description()
  const missionResult = contract.try_mission()
  const imageResult = contract.try_image()
  const extendResult = contract.try_extend()
  const memberAddress = contract.try_member()
  const votePoolAddress = contract.try_root()
  const operatorAddress = contract.try_operator()
  const ledgerAddress = contract.try_ledger()
  return {
    name: nameResult.reverted ? 'unknown' : nameResult.value,
    description: descriptionResult.reverted
      ? 'unknown'
      : descriptionResult.value,
    mission: missionResult.reverted ? 'unknown' : missionResult.value,
    image: imageResult.reverted ? 'unknown' : imageResult.value,
    extend: extendResult.reverted ? null : extendResult.value,
    memberAddress: memberAddress.reverted ? ADDRESS_ZERO : memberAddress.value,
    votePoolAddress: votePoolAddress.reverted
      ? ADDRESS_ZERO
      : votePoolAddress.value,
    operatorAddress: operatorAddress.reverted
      ? ADDRESS_ZERO
      : operatorAddress.value,
    ledgerAddress: ledgerAddress.reverted ? ADDRESS_ZERO : ledgerAddress.value
  } as DAOPrimaryInfo
}

export function fetchMemberValue(
  address: Address,
  tokenId: BigInt
): MemberInfo {
  const contract = MemberContract.bind(address)
  log.debug('Fetching Member ID {}', [tokenId.toString()])
  log.debug('Fetching Member Info. Contract Address {} ID {}', [
    address.toHex(),
    tokenId.toString()
  ])
  const total = contract.total()
  log.debug('Total Member {}', [total.toString()])
  const infoResult = contract.try_getMemberInfo(tokenId)
  log.debug('Member Info Result. Reverted {}', [infoResult.reverted.toString()])
  if (infoResult.reverted) {
    return {
      name: null,
      description: null,
      image: null,
      votes: ZERO_BI
    } as MemberInfo
  } else {
    return {
      name: infoResult.value.name,
      description: infoResult.value.description,
      image: infoResult.value.image,
      votes: infoResult.value.votes
    } as MemberInfo
  }
}

export function setExecutor(memberAddress: Address, tokenId: BigInt): void {
  const memberId = memberAddress.toHex().concat('-').concat(tokenId.toHex())
  const member = Member.load(memberId)
  if (member === null) {
    log.warning('DAO Set Executor. Member {} not found', [memberId])
    return
  }
  let dao = DAO.load(member.dao)
  if (dao === null) {
    log.warning('DAO Set Executor. DAO {} not found', [member.dao])
    return
  }
  const account = Account.load(member.account)
  if (account === null) {
    log.warning('DAO Set Executor. Account {} not found', [member.account])
    return
  }
  dao.executor = member.account
  dao.save()

  log.info('DAO Update Executor Success. Account {}', [account.id])
}

export function getOrCreateVotePoolProposal(
  id: BigInt,
  address: Address,
  DAOAddress: Address
): Proposal {
  const dao = getOrCreateDAO(DAOAddress)
  const votePoolId = DAOAddress.toHex().concat('-').concat(id.toHex())
  log.debug('Create Vote Pool ID {}', [votePoolId])

  let votePool = VotePool.load(votePoolId)
  if (votePool === null) {
    votePool = new VotePool(votePoolId)
    votePool.dao = dao.id
    votePool.address = address
    votePool.save()
    dao.votePool = votePool.id
    dao.save()
    log.info('Vote Pool Created. ID {}', [votePoolId])
  }

  const proposalId = id.toHex()
  let voteProposal = Proposal.load(proposalId)
  if (voteProposal === null) {
    voteProposal = new Proposal(proposalId)
  }
  voteProposal.votePool = votePool.id
  const info = fetchVoteProposalValue(id, address, DAOAddress)
  voteProposal.name = info.name
  voteProposal.description = info.description
  info.isAnonymous
    ? (voteProposal.origin = null)
    : (voteProposal.origin = dao.id.concat('-').concat(info.origin.toHex()))
  voteProposal.isAnonymous = info.isAnonymous
  voteProposal.originAddress = info.origin
  voteProposal.lifespan = info.lifespan
  voteProposal.expiry = info.expiry
  voteProposal.save()
  log.info('Vote Proposal Created. ID {}', [proposalId])

  return voteProposal as Proposal
}

export function fetchVoteProposalValue(
  id: BigInt,
  address: Address,
  DAOAddress: Address
): ProposalInfo {
  log.debug('Fetching Vote Proposal DAO Address {}', [DAOAddress.toHex()])
  const contract = VotePoolContract.bind(address)
  log.debug('Fetching Vote Proposal ID {}', [id.toHex()])
  log.debug('Fetching Vote Proposal Info. Contract Address {} ID {}', [
    address.toHex(),
    id.toHex()
  ])
  const proposal = contract.try_getProposal(id)
  log.debug('Vote Proposal Info Result. Reverted {}', [
    proposal.reverted.toString()
  ])
  if (proposal.reverted) {
    return {
      isAnonymous: true,
      origin: ADDRESS_ZERO,
      name: null,
      description: null,
      lifespan: ZERO_BI,
      expiry: ZERO_BI
    } as ProposalInfo
  } else {
    const isAnonymous = proposal.value.originId === ZERO_BI
    let origin: Address = ADDRESS_ZERO
    if (!isAnonymous) {
      const daoValues = fetchDAOBasicValue(DAOAddress)
      const memberId = daoValues.memberAddress
        .toHex()
        .concat('-')
        .concat(proposal.value.originId.toHex())
      log.debug('Vote Proposal is Not Anonymous Member ID {}', [memberId])
      const member = Member.load(memberId)
      if (member !== null) {
        log.debug('Vote Proposal Member Found Account ID {}', [member.account])
        const account = Account.load(member.account)
        if (account !== null) {
          log.debug('Vote Proposal Account Found Address {}', [
            account.address.toHex()
          ])
          origin = Address.fromBytes(account.address)
        }
      }
    }
    return {
      isAnonymous,
      origin: isAnonymous ? proposal.value.origin : origin,
      name: proposal.value.name,
      description: proposal.value.description,
      lifespan: proposal.value.lifespan,
      expiry: proposal.value.expiry
    } as ProposalInfo
  }
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
