import { Address, Bytes } from '@graphprotocol/graph-ts'

import { DAO } from '../generated/schema'
import { DAO as DAOContract } from '../generated/templates/DAOInitializable/DAO'

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'
export class DAOPrimaryInfo {
  name: string
  description: string
  mission: string
  brandImage: string
  extend: Bytes | null
}

export function getOrCreateDAO(address: Address): DAO {
  let id = address.toHex()
  let dao = DAO.load(id)
  if (dao === null) {
    dao = new DAO(id)
  }
  return dao as DAO
}

export function fetchDAOBasicValue(address: Address): DAOPrimaryInfo {
  let contract = DAOContract.bind(address)
  let nameResult = contract.try_name()
  let descriptionResult = contract.try_description()
  let missionResult = contract.try_mission()
  let brandImageResult = contract.try_image()
  let extendResult = contract.try_extend()
  return {
    name: nameResult.reverted ? 'unknown' : nameResult.value,
    description: descriptionResult.reverted
      ? 'unknown'
      : descriptionResult.value,
    mission: missionResult.reverted ? 'unknown' : missionResult.value,
    brandImage: brandImageResult.reverted ? 'unknown' : brandImageResult.value,
    extend: extendResult.reverted ? null : extendResult.value
  } as DAOPrimaryInfo
}
