import { Address, Bytes, log, BigInt } from '@graphprotocol/graph-ts'

import { AssetShell as AssetShellContract } from '../generated/templates/AssetInitializable/AssetShell'
import { DAO as DAOContract } from '../generated/templates/DAOInitializable/DAO'
import { ERC20 as ERC20Contract } from '../generated/templates/ERC20Initializable/ERC20'
import { Member as MemberContract } from '../generated/templates/MemberInitializable/Member'
import { VotePool as VotePoolContract } from '../generated/templates/VotePoolInitializable/VotePool'
import { ZERO_BI } from './utils'

export class ERC20Info {
  symbol: string | null
  name: string | null
}

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
  originAssetAddress: Address
  assetAddress: Address
  asset2Address: Address
}

export class MemberInfo {
  baseName: string
  name: string
  description: string
  image: string
  votes: BigInt
  owner: Address
}

export class MemberPoolInfo {
  executor: BigInt
}

export class ProposalInfo {
  isAnonymous: boolean
  origin: string | null
  originAddress: Address
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

export class VotePoolInfo {
  lifespan: BigInt
}

export class AssetInfo {
  uri: string
  totalSupply: BigInt
  minimumPrice: BigInt
}

export class AssetContractInfo {
  name: string
  description: string
  baseURI: string
  externalLink: string
  sellerFeeBasisPoints: BigInt
  isEnableLock: boolean
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
  return {
    name: contract.name(),
    description: contract.description(),
    mission: contract.mission(),
    image: contract.image(),
    extend: contract.extend(),
    memberAddress: contract.member(),
    votePoolAddress: contract.root(),
    operatorAddress: contract.operator(),
    ledgerAddress: contract.ledger(),
    originAssetAddress: contract.asset(),
    assetAddress: contract.first(),
    asset2Address: contract.second()
  } as DAOPrimaryInfo
}

export function fetchMemberPoolValue(address: Address): MemberPoolInfo {
  const contract = MemberContract.bind(address)

  return {
    executor: contract.executor()
  } as MemberPoolInfo
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
  const owner = contract.ownerOf(tokenId)
  log.debug('Total Member {}', [total.toString()])
  const info = contract.getMemberInfo(tokenId)
  return {
    baseName,
    owner,
    name: info.name,
    description: info.description,
    image: info.image,
    votes: info.votes
  } as MemberInfo
}

export function fetchVotePoolValue(address: Address): VotePoolInfo {
  const contract = VotePoolContract.bind(address)
  return {
    lifespan: contract.lifespan()
  } as VotePoolInfo
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
  const proposal = contract.getProposal(id)
  const isAnonymous = proposal.originId == ZERO_BI
  log.debug('Fetching Vote Proposal Is Anonymous {}', [isAnonymous.toString()])
  log.debug('Fetching Vote Proposal Origin ID {}', [proposal.originId.toHex()])
  return {
    isAnonymous,
    origin: isAnonymous
      ? proposal.origin.toHex()
      : DAOAddress.toHex().concat('-').concat(proposal.originId.toHex()),
    originAddress: proposal.origin,
    name: proposal.name,
    description: proposal.description,
    lifespan: proposal.lifespan,
    expiry: proposal.expiry,
    target: proposal.target,
    data: proposal.data,
    passRate: proposal.passRate,
    loopCount: proposal.loopCount,
    loopTime: proposal.loopTime,
    voteTotal: proposal.voteTotal,
    agreeTotal: proposal.agreeTotal,
    executeTime: proposal.executeTime,
    isAgree: proposal.isAgree,
    isClose: proposal.isClose,
    isExecuted: proposal.isExecuted
  } as ProposalInfo
}

export function fetchAssetValue(address: Address, tokenId: BigInt): AssetInfo {
  const contract = AssetShellContract.bind(address)

  return {
    uri: contract.uri(tokenId),
    totalSupply: contract.totalSupply(tokenId),
    minimumPrice: contract.minimumPrice(tokenId)
  } as AssetInfo
}

export function fetchAssetShellValue(address: Address): AssetContractInfo {
  const contract = AssetShellContract.bind(address)

  return {
    name: contract.name(),
    description: contract.description(),
    baseURI: contract.baseURI(),
    externalLink: contract.external_link(),
    sellerFeeBasisPoints: contract.seller_fee_basis_points(),
    isEnableLock: contract.isEnableLock()
  } as AssetContractInfo
}

export function fetchERC20(address: Address): ERC20Info {
  const contract = ERC20Contract.bind(address)
  const tryName = contract.try_name()
  const trySymbol = contract.try_symbol()
  return {
    symbol: trySymbol.reverted ? null : trySymbol.value,
    name: tryName.reverted ? null : tryName.value
  } as ERC20Info
}
