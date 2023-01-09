import { Context } from '@smart-dao-subgraph/cli'

import { Variables } from '../subgraph.config'

export const ethereum: Context<Variables> = {
  name: 'smart-dao',
  network: 'mainnet',
  variables: {
    block: 0,
    persistent: {
      DAOsProxyAddress: '' // 指定主网合约地址
    }
  }
}
