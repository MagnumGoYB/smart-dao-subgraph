import { DataSourceUserDeclaration } from '@smart-dao-subgraph/cli'

import { Variables } from '../subgraph.config'

export const sources = (variables: Variables): DataSourceUserDeclaration[] => {
  return [
    {
      name: 'DAOs',
      block: variables.block,
      address: variables.contractAddresses.DAOsAddress
    }
  ]
}
