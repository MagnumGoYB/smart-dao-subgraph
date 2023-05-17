import { Address, dataSource, log } from '@graphprotocol/graph-ts'

import {
  Close as CLoseEvent,
  Created as CreatedEvent,
  Execute as ExecuteEvent,
  Vote as VoteEvent
} from './../../generated/templates/VotePoolInitializable/VotePool'
import {
  ONE_BI,
  getOrCreateStatistic,
  getOrCreateVote,
  getOrCreateVotePool,
  getOrCreateVoteProposal
} from '../utils'

const context = dataSource.context()
const DAOAddress = context.getString('DAOAddress')

const pool = getOrCreateVotePool(
  dataSource.address(),
  Address.fromString(DAOAddress)
)

const statistic = getOrCreateStatistic()

export function handleCreated(event: CreatedEvent): void {
  log.info('DAO Vote Proposal Created. ID {}, Address {}, DAO {}', [
    event.params.id.toHex(),
    dataSource.address().toHex(),
    DAOAddress
  ])

  const proposal = getOrCreateVoteProposal(
    event.params.id,
    pool,
    dataSource.address(),
    Address.fromString(DAOAddress),
    event.block
  )

  proposal.number = pool.proposalTotal.toI32()
  proposal.save()

  pool.proposalTotal = pool.proposalTotal.plus(ONE_BI)
  pool.save()

  statistic.totalProposals = statistic.totalProposals.plus(ONE_BI)
  statistic.save()
}
export function handleVote(event: VoteEvent): void {
  log.info('DAO Vote Proposal Vote. ID {}, Address {}, DAO {}', [
    event.params.id.toHex(),
    dataSource.address().toHex(),
    DAOAddress
  ])

  const proposal = getOrCreateVoteProposal(
    event.params.id,
    pool,
    dataSource.address(),
    Address.fromString(DAOAddress),
    event.block
  )

  getOrCreateVote(
    pool,
    proposal,
    event.params.member,
    event.params.votes,
    event.block,
    event.transaction
  )

  pool.votedTotal = pool.votedTotal.plus(event.params.votes)
  pool.save()

  statistic.totalVotes = statistic.totalVotes.plus(event.params.votes)
  statistic.save()
}

export function handleClose(event: CLoseEvent): void {
  log.info('DAO Vote Proposal Close. ID {}, Address {}, DAO {}', [
    event.params.id.toHex(),
    dataSource.address().toHex(),
    DAOAddress
  ])

  getOrCreateVoteProposal(
    event.params.id,
    pool,
    dataSource.address(),
    Address.fromString(DAOAddress),
    event.block
  )

  pool.proposalClosedTotal = pool.proposalClosedTotal.plus(ONE_BI)
  pool.save()

  statistic.totalClosedProposals = statistic.totalClosedProposals.plus(ONE_BI)
  statistic.save()
}

export function handleExecute(event: ExecuteEvent): void {
  log.info('DAO Vote Proposal Execute. ID {}, Address {}, DAO {}', [
    event.params.id.toHex(),
    dataSource.address().toHex(),
    DAOAddress
  ])

  getOrCreateVoteProposal(
    event.params.id,
    pool,
    dataSource.address(),
    Address.fromString(DAOAddress),
    event.block
  )

  pool.proposalExecutedTotal = pool.proposalExecutedTotal.plus(ONE_BI)
  pool.save()

  statistic.totalExecutedProposals =
    statistic.totalExecutedProposals.plus(ONE_BI)
  statistic.save()
}
