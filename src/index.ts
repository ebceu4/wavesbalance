import * as TelegramBot from 'node-telegram-bot-api'
import { Database } from './Database'
import { Text } from './Text';
import { WavesNotifications } from './WavesNotifications';

const db = Database()
const token = '';
const bot = new TelegramBot(token, { polling: true });
const subscriptionRemove = 'subscription/remove/'
const wn = WavesNotifications(() => db.getWallets())

wn.onWalletBalanceChanged(async (address, balances) => {
  const userIds = await db.getUserIds(address)
  if (userIds && userIds.length > 0) {
    userIds.forEach(async id => {
      const user = await db.getUser(id)
      bot.sendMessage(id, Text[user.language_code].balance_changed(address, balances['WAVES']))
    })
  }
})

bot.on('message', async (msg) => {
  const from = msg.from
  const user = await db.addUser(from.id, from.is_bot == 'true' ? 1 : 0, from.first_name, from.last_name, from.username, from.language_code)

  if (msg.text.startsWith('/help') || msg.text.startsWith('/start')) {
    bot.sendMessage(from.id, Text[user.language_code].help)
    return
  }
  if (msg.text.startsWith('3P')) {
    const address = msg.text
    db.addWallet(msg.text)
    const isNew = await db.addSubscription(address, user.id)
    if (isNew) {
      wn.subscribeToWalletBalance(address)
      bot.sendMessage(user.id, Text[user.language_code].wallet_added(address))
    } else {
      bot.sendMessage(user.id, Text[user.language_code].remove_wallet_question(address), {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: Text[user.language_code].button_yes,
                callback_data: `${subscriptionRemove}${address}`,
              },
              {
                text: Text[user.language_code].button_no,
                callback_data: `remove/cancel`,
              },
            ]
          ]
        }
      })
    }
  }
  else {
    bot.sendMessage(user.id, Text[user.language_code].wrong_wallet)
  }
})

bot.on('callback_query', async callback => {
  const id = callback.id
  const chatId = callback.message.chat.id
  const user = await db.getUser(chatId)

  if (callback.data.startsWith(subscriptionRemove)) {
    const address = callback.data.substr(subscriptionRemove.length)
    const isRemoved = await db.removeSubscription(address, user.id)
    if (isRemoved) {
      bot.sendMessage(user.id, Text[user.language_code].wallet_removed(address))
    }
  }

  bot.answerCallbackQuery({ callback_query_id: id, text: Text[user.language_code].done })
})
