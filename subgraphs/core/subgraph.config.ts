import { Configurator, Contexts, DataSourceUserDeclaration } from '@smart-dao-subgraph/cli'

import * as contractAddresses from './config/contract-addresses'
import { ethereum } from './contexts/ethereum'
import { goerli } from './contexts/goerli'

export interface Variables {
  block?: number
  contractAddresses: {
    DAOsAddress: string
  }
}

export const contexts: Contexts<Variables> = {
  ethereum,
  goerli
}

export const configure: Configurator<Variables> = (variables) => {
  const sources: DataSourceUserDeclaration[] = [...contractAddresses.sources(variables)]

  return { sources: [...sources] }
}
