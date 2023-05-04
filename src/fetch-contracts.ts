import { Address, Bytes, log, BigInt } from '@graphprotocol/graph-ts'

import { ADDRESS_ZERO, ZERO_BI } from './utils'
import { Account, Member } from '../generated/schema'
import { DAO as DAOContract } from '../generated/templates/DAOInitializable/DAO'
import { Member as MemberContract } from '../generated/templates/MemberInitializable/Member'
import { VotePool as VotePoolContract } from '../generated/templates/VotePoolInitializable/VotePool'

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
  baseName: string
  name: string
  description: string
  image: string
  votes: BigInt
}

export class ProposalInfo {
  isAnonymous: boolean
  origin: Address
  name: string | null
  description: string | null
  lifespan: BigInt | null
  expiry: BigInt | null
  target: Address[]
  data: Bytes[]
  passRate: BigInt | null
  loopCount: BigInt | null
  loopTime: BigInt | null
  voteTotal: BigInt | null
  agreeTotal: BigInt | null
  executeTime: BigInt | null
  isAgree: boolean
  isClose: boolean
  isExecuted: boolean
}

export class CreateLedgerParam {
  from: Address | null
  balance: BigInt | null
  name: string | null
  description: string | null
  to: Address | null
  member: BigInt | null
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
  const baseName = contract.name()
  const total = contract.total()
  log.debug('Total Member {}', [total.toString()])
  const info = contract.getMemberInfo(tokenId)
  return {
    baseName,
    name: info.name,
    description: info.description,
    image: info.image,
    votes: info.votes
  } as MemberInfo
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
      expiry: ZERO_BI,
      target: [],
      data: [],
      passRate: null,
      loopCount: null,
      loopTime: null,
      voteTotal: ZERO_BI,
      agreeTotal: ZERO_BI,
      executeTime: null,
      isAgree: false,
      isClose: false,
      isExecuted: false
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
        origin = Address.fromString(member.id)
      }
    }
    return {
      isAnonymous,
      origin: isAnonymous ? proposal.value.origin : origin,
      name: proposal.value.name,
      description: proposal.value.description,
      lifespan: proposal.value.lifespan,
      expiry: proposal.value.expiry,
      target: proposal.value.target,
      data: proposal.value.data,
      passRate: proposal.value.passRate,
      loopCount: proposal.value.loopCount,
      loopTime: proposal.value.loopTime,
      voteTotal: proposal.value.voteTotal,
      agreeTotal: proposal.value.agreeTotal,
      executeTime: proposal.value.executeTime,
      isAgree: proposal.value.isAgree,
      isClose: proposal.value.isClose,
      isExecuted: proposal.value.isExecuted
    } as ProposalInfo
  }
}
