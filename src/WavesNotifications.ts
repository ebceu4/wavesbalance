import * as WebSocket from 'ws'

export interface IDictionary<TValue> {
  [key: string]: TValue
}

export interface IWavesNotifications {
  subscribeToWalletBalance: (address: string) => void,
  onWalletBalanceChanged: (handler: (address: string, balances: IDictionary<string>) => void) => void
}

export const WavesNotifications = (getWallets: () => Promise<string[]>): IWavesNotifications => {

  let webSocket: { subscribe: (address: string) => void }
  let balanceChangedHandler: (address: string, balances: IDictionary<string>) => void

  const wsOpen = () => {
    const ws = new WebSocket('ws://ws.wavesplatform.com/api');
    let isConnected = false

    ws.on('open', async function open() {
      isConnected = true
      console.log('CONNECTED -> wavesplatform.com/api')
      const wallets = await getWallets()
      wallets.forEach(w => webSocket.subscribe(w))
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
        if (balanceChangedHandler)
          balanceChangedHandler(address, json.msg)
      }
    })

    return {
      subscribe: address => {
        if (isConnected)
          ws.send(`{"op":"subscribe balance/${address}"}`)
      }
    }
  }

  webSocket = wsOpen()

  return {
    onWalletBalanceChanged: (handler) => {
      balanceChangedHandler = handler
    },
    subscribeToWalletBalance: (address) => {
      webSocket.subscribe(address)
    }
  }
}

