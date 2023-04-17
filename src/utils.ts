import { Address, Bytes, BigInt, log, ByteArray } from '@graphprotocol/graph-ts'

import { Account, DAO, Member, Proposal, VotePool } from '../generated/schema'
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
  memberAddress: Address,
  tokenId: BigInt
): Account {
  const id = address.toHex()
  let account = Account.load(id)
  if (account === null) {
    account = new Account(id)
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
  const account = getOrCreateAccount(accountAddress, memberAddress, tokenId)
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
      : votePoolAddress.value
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
  voteProposal.proposal = votePool.id
  const info = fetchVoteProposalValue(id, address, DAOAddress)
  voteProposal.name = info.name
  voteProposal.description = info.description
  info.isAnonymous
    ? (voteProposal.origin = info.origin.toHex())
    : (voteProposal.origin = null)
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
      const member = Member.load(memberId)
      if (member !== null) origin = Address.fromString(member.account)
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
