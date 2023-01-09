import {
  DataSourceTemplateUserDeclaration,
  DataSourceUserDeclaration
} from '@smart-dao-subgraph/cli'

import { Variables } from '../subgraph.config'

export const sources = (variables: Variables): DataSourceUserDeclaration[] => {
  return [
    {
      name: 'DAOsProxy',
      block: variables.block,
      address: variables.persistent.DAOsProxyAddress
    }
  ]
}

export const templates: DataSourceTemplateUserDeclaration[] = [{ name: 'DAO' }]
