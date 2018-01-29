import axios from 'axios'
import { IWalletBalances } from './Interfaces/IWalletBalances';
import { IDictionary } from './Interfaces/IDictionary';
import { IAsset } from './Interfaces/IAsset';

export const getBalance = async (address: string): Promise<IWalletBalances> => {
  const result = await axios.all([
    axios.get(`https://nodes.wavesnodes.com/addresses/balance/${address}`),
    axios.get(`https://nodes.wavesnodes.com/assets/balance/${address}`)
  ])

  const balances = {}
  const assets: IDictionary<IAsset> = {
    WAVES: {
      alias: 'WAVES',
      decimals: 8,
      quantity: '100000000',
      description: 'Waves offical',
      id: 'WAVES',
      issuer: 'WAVES',
      reissuable: false,
      timestamp: '0'
    }
  }

  result.forEach(r => {
    if (r.status == 200) {
      if (r.data.balance) {
        balances['WAVES'] = r.data.balance
      }
      else {
        r.data.balances.forEach(b => {
          balances[b.assetId] = b.balance
          assets[b.assetId] = {
            alias: b.issueTransaction.name,
            decimals: b.issueTransaction.decimals,
            description: b.issueTransaction.description,
            id: b.assetId,
            issuer: b.issueTransaction.sender,
            quantity: b.issueTransaction.quantity,
            reissuable: b.issueTransaction.reissuable,
            timestamp: b.issueTransaction.timestamp
          }
        });
      }
    }
  })

  return { address, balances, assets }
}
