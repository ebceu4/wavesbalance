import * as TelegramBot from 'node-telegram-bot-api'
import * as WebSocket from 'ws'
import { Database } from './Database'

const db = Database()
const token = '';
const bot = new TelegramBot(token, { polling: true });

const ws = new WebSocket('ws://ws.wavesplatform.com/api');

ws.on('open', async function open() {
  const wallets = await db.getWallets()
  wallets.forEach(w => ws.send(`{"op":"subscribe balance/${w}"}`))
})

ws.on('message', async function incoming(data) {
  const json = JSON.parse(data.toString())
  console.log(json)
  if (json.op.indexOf('balance/') == 0) {
    const address = json.op.substr(8)
    const userId = await db.getUserId(address)

    const msg = `New balance on ${address} -> ${json.msg['WAVES']}`
    if(userId && userId.length > 0) {
      bot.sendMessage(userId[0], msg)
    }
    console.log(msg)
  }

  /*{\
    "op" : "balance/3P31zvGdh6ai6JK6zZ18TjYzJsa1B83YPoj",
      "msg" : {
      "WAVES" : 1264213718872765,
 }
)*/

})

bot.onText(new RegExp('\/wallet'), (msg, match) => {
  const chatId = msg.chat.id
  const resp = match[0]

  bot.sendMessage(chatId, 'Here are your wallets:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '(+) add wallet',
            callback_data: 'add_wallet',
          }
        ]
      ]
    }
  })
})

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  console.log(msg)
  db.addWallet(msg.text, chatId)
  ws.send(`{"op":"subscribe balance/${msg.text}"}`)
});

bot.on('callback_query', callback => {
  const id = callback.id
  const chatId = callback.message.chat.id
  switch (callback.data) {
    case 'add_wallet':
      const r = 'Please send me your wallet address, for example: 3PBkqPd2chKH7uHViB3qkjKyYAJCSrsahbt'
      bot.sendMessage(chatId, r)
      bot.answerCallbackQuery({ callback_query_id: id, text: r })
      break;

    default:
      break;
  }
})