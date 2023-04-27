import { Address, dataSource, log } from '@graphprotocol/graph-ts'

import { Created as CreatedEvent } from './../../generated/templates/VotePoolInitializable/VotePool'
import { getOrCreateVotePoolProposal } from '../utils'

const context = dataSource.context()
const DAOAddress = context.getString('DAOAddress')

export function handleCreated(event: CreatedEvent): void {
  log.info('DAO Vote Proposal Created. ID {}, Address {}, DAO {}', [
    event.params.id.toHex(),
    dataSource.address().toHex(),
    DAOAddress
  ])

  getOrCreateVotePoolProposal(
    event.params.id,
    dataSource.address(),
    Address.fromString(DAOAddress),
    event.block
  )
}

export function handleVote(): void {}
export function handleClose(): void {}
export function handleExecute(): void {}
