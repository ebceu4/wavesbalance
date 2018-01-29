import * as WebSocket from 'ws'
import { Observable, IObservable } from 'rx-lite';
import { IDictionary } from './Interfaces/IDictionary';
import { IWalletBalances } from './Interfaces/IWalletBalances';
import { getBalance } from './WavesAPI'

export interface IWalletNotifications {
  balances: IObservable<IWalletBalances>
  addWallet: (address: string) => void
}

export const WavesNotifications = (getWallets: () => Promise<string[]>): IWalletNotifications => {
  let webSocket: { subscribe: (address: string) => void }

  const balances = Observable.create<IWalletBalances>(observer => {

    const wsOpen = () => {
      const ws = new WebSocket('ws://ws.wavesplatform.com/api');
      let isConnected = false

      ws.on('open', async function open() {
        isConnected = true
        console.log('CONNECTED -> wavesplatform.com/api')
        const wallets = await getWallets()
        wallets.forEach(async w => {
          if (isConnected) {
            webSocket.subscribe(w)
            try {
              const result = await getBalance(w)
              observer.onNext(result)
            } catch (error) {
              
            }
          }
        })
      })

      ws.on('close', (code, reason) => {
        isConnected = false
        console.log('DISCONNECTED -> wavesplatform.com/api')
        ws.removeAllListeners()
        webSocket = wsOpen()
      })

      ws.on('message', async function incoming(data) {
        const json = JSON.parse(data.toString())
        if (json.op.indexOf('balance/') == 0) {
          const address = json.op.substr(8)
          observer.onNext({ address, balances: json.msg })
        }
      })

      return {
        subscribe: async address => {
          if (isConnected)
            ws.send(`{"op":"subscribe balance/${address}"}`)

            try {
              const result = await getBalance(address)
              observer.onNext(result)
            } catch (error) {
              
            }
        }
      }
    }

    webSocket = wsOpen()
  })

  return {
    balances, addWallet: (address: string) => {
      if (webSocket) webSocket.subscribe(address)
    }
  }
}