import {
  Configurator,
  Contexts,
  DataSourceTemplateUserDeclaration,
  DataSourceUserDeclaration,
  SdkUserDeclaration
} from '@smart-dao-subgraph/cli'

import * as persistent from './config/persistent'
import { ethereum } from './contexts/ethereum'
import { goerli } from './contexts/goerli'

export interface Variables {
  block: number
  persistent: {
    DAOsProxyAddress: string
  }
}

export const contexts: Contexts<Variables> = {
  ethereum,
  goerli
}

export const configure: Configurator<Variables> = (variables) => {
  const sdks: SdkUserDeclaration[] = [
    {
      name: 'DAOLibs',
      abis: {
        DAO: 'abis/DAO.json'
      },
      functions: (abis) => [abis.DAO.getFunction('name')]
    }
  ]

  const sources: DataSourceUserDeclaration[] = [...persistent.sources(variables)]

  const templates: DataSourceTemplateUserDeclaration[] = [...persistent.templates]

  return { sources: [...sources], sdks, templates }
}
