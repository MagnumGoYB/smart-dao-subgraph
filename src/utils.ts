import { Address, Bytes, BigInt, log, ByteArray } from '@graphprotocol/graph-ts'

import { DAO, Member, User } from '../generated/schema'
import { DAO as DAOContract } from '../generated/templates/DAOInitializable/DAO'
import { Member as MemberContract } from '../generated/templates/MemberInitializable/Member'

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
}

export class MemberInfo {
  name: string | null
  description: string | null
  image: string | null
  votes: BigInt
}

export function getOrCreateDAO(address: Address): DAO {
  const id = address.toHex()
  let dao = DAO.load(id)
  if (dao === null) {
    dao = new DAO(id)
  }
  return dao as DAO
}

export function getOrCreateUser(
  address: Address,
  memberAddress: Address,
  tokenId: BigInt
): User {
  const id = address.toHex()
  let user = User.load(id)
  if (user === null) {
    user = new User(id)
  }
  log.debug('Get Member ID {}', [tokenId.toString()])
  const info = fetchMemberValue(memberAddress, tokenId)
  user.name = info.name
  user.description = info.description
  user.image = info.image
  user.votes = info.votes
  user.save()
  return user as User
}

export function getOrCreateMember(
  tokenId: BigInt,
  memberAddress: Address,
  userAddress: Address,
  DAOAddress: Address
): Member {
  const memberId = memberAddress.toHex().concat('-').concat(tokenId.toHex())
  log.debug('Member ID {}', [memberId])
  const dao = getOrCreateDAO(DAOAddress)
  const user = getOrCreateUser(userAddress, memberAddress, tokenId)
  let member = Member.load(memberId)
  if (member === null) {
    member = new Member(memberId)
    member.dao = dao.id
    member.user = user.id
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
  return {
    name: nameResult.reverted ? 'unknown' : nameResult.value,
    description: descriptionResult.reverted
      ? 'unknown'
      : descriptionResult.value,
    mission: missionResult.reverted ? 'unknown' : missionResult.value,
    image: imageResult.reverted ? 'unknown' : imageResult.value,
    extend: extendResult.reverted ? null : extendResult.value,
    memberAddress: memberAddress.reverted ? ADDRESS_ZERO : memberAddress.value
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
  const user = User.load(member.user)
  if (user === null) {
    log.warning('DAO Set Executor. User {} not found', [member.user])
    return
  }
  dao.executor = member.user
  dao.save()

  log.info('DAO Update Executor Success. User {}', [user.id])
}
