import * as TelegramBot from 'node-telegram-bot-api'
import { Database } from './Database'
import { Text } from './Text'
import { WavesNotifications } from './WavesNotifications'
import * as uuid from 'uuid/v4'
import { validateAddress } from './WavesCrypto';
import { Secret } from './Secret';


const db = Database()
const bot = new TelegramBot(Secret.telegrammToken, { polling: true });
const wn = WavesNotifications(() => db.getWallets())
const commands = {
  help: '/help',
  language: '/language',
  wallets: '/wallets'
}
const callbackActions = {
  removeSubscription: (address) =>  ``,
  toggleSubscription: (address) =>  ``,
  renameSubscription: (address) =>  ``,
}
const commandList = () =>
  Object.keys(commands).map(k => commands[k]).join('  ')

interface IDialogResult {
  code?: string,
  notify: (text?: string) => void
}
const showDialog = (chatId: number, text: string, ...buttons: string[][]): Promise<IDialogResult> => new Promise(async (resolve, reject) => {

  const codes = {}
  let timeout

  const clear = () => {
    clearTimeout(timeout)
    Object.keys(k => delete codes[k])
  }

  const inline_keyboard = [buttons.map(b => {
    const id = uuid()
    codes[id] = b[1]
    return { text: b[0], callback_data: id }
  })]

  const message = await bot.sendMessage(chatId, text, {
    reply_markup: { inline_keyboard }
  })

  const messageId = (<TelegramBot.Message>message).message_id
  if (messageId) {
    const handler = async (callback: TelegramBot.CallbackQuery) => {

      if (callback.from.id != chatId)
        return

      const id = callback.id
      const code = codes[callback.data]

      if (code) {
        const notify = (text?: string) => {
          bot.answerCallbackQuery(callback.id, { text })
        }
        clear()
        bot.removeListener('callback_query', handler)
        bot.deleteMessage(chatId, messageId.toString())
        resolve({ code, notify })
      }
    }

    timeout = setTimeout(() => {
      clear()
      bot.removeListener('callback_query', handler)
      bot.deleteMessage(chatId, messageId.toString())
      resolve({ notify: (text?: any) => { } })
    }, 20000)

    bot.on('callback_query', handler)
  } else {
    reject(<Error>message)
  }
})

wn.balances.subscribe(async walletBalances => {
  const { address, balances, assets } = walletBalances

  if (assets) {
    Object.keys(assets).forEach(async assetId => {
      const {
        id,
        alias,
        decimals,
        description,
        issuer,
        quantity,
        reissuable,
        timestamp } = assets[assetId]
      db.addAsset(id, alias, decimals, description, issuer, quantity, reissuable, timestamp)
    })
  }

  Object.keys(balances).forEach(async assetId => {
    const newBalance = balances[assetId]
    const { $old, $new } = await db.updateBalance(address, assetId, newBalance)
    if (!$old || $old.$balance != $new.$balance) {
      const asset = await db.getAsset(assetId)
      const userIds = await db.getUserIds(address)
      if (userIds && userIds.length > 0) {
        userIds.forEach(async id => {
          const user = await db.getUser(id)
          bot.sendMessage(id, Text[user.language_code].asset_balance_changed(address, asset.alias, newBalance))
        })
      }
    }
  })
})

bot.on('message', async (msg) => {
  console.log(msg)
  const from = msg.from
  await db.addUser(from.id, from.is_bot == 'true' ? 1 : 0, from.first_name, from.last_name, from.username, from.language_code)
  const user = await db.getUser(from.id)
  if (msg.text.startsWith(commands.help) || msg.text.startsWith('/start')) {
    bot.sendMessage(from.id, Text[user.language_code].help)
    return
  }
  if (msg.text.startsWith(commands.language)) {
    const result = await showDialog(user.id, Text[user.language_code].language_change_question,
      [Text[user.language_code].button_en, 'en'],
      [Text[user.language_code].button_ru, 'ru'],
    )

    if (result.code) {
      user.language_code = result.code
      await db.updateUser(user)
      const m = Text[user.language_code].language_changed(user.language_code)
      bot.sendMessage(user.id, m)
      result.notify(m)
    }

    return
  }
  if (msg.text.startsWith(commands.wallets)) {
    const subscriptions = await db.getUserSubscriptions(user.id)
    if (subscriptions && subscriptions.length > 0) {

      const arr = subscriptions.map(s => {
        console.log(s)
        const buttonText = `${s.disabled ? '⚪' : '🔵'}  ${s.alias ? s.alias : s.address}`
        return [
          [{ text: buttonText, callback_data: `subscription/toggle/${s.address}` }],
          [{ text: '✏', callback_data: `subscription/edit/${s.address}` },
          { text: '❌', callback_data: `subscription/remove/${s.address}` }]]
      })

      const inline_keyboard = []
      arr.forEach(a => { inline_keyboard.push(a[0]); inline_keyboard.push(a[1]) })

      const message = await bot.sendMessage(user.id, 'Your subscriptions:', {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard }
      })
    }
    else {
      bot.sendMessage(user.id, 'No subscriptions yet.')
    }
    return
  }
  if (msg.text.startsWith('3P')) {
    if (!validateAddress(msg.text)) {
      bot.sendMessage(user.id, Text[user.language_code].address_not_valid)
      return
    }
    const address = msg.text
    db.addWallet(address, user.id)
    const isNew = await db.addSubscription(address, user.id)
    if (isNew) {
      wn.addWallet(address)
      bot.sendMessage(user.id, Text[user.language_code].wallet_added(address))
    } else {
      const result = await showDialog(user.id,
        Text[user.language_code].remove_wallet_question(address),
        [Text[user.language_code].button_yes, 'yes'],
        [Text[user.language_code].button_no, 'no']
      )

      switch (result.code) {
        case 'yes':
          const isRemoved = await db.removeSubscription(address, user.id)
          if (isRemoved)
            bot.sendMessage(user.id, Text[user.language_code].wallet_removed)
          result.notify(Text[user.language_code].wallet_removed)
          break;
        case 'no':
          bot.sendMessage(user.id, Text[user.language_code].wallet_not_removed)
          result.notify(Text[user.language_code].wallet_not_removed)
          break;
        default:
          break;
      }
    }
  }
  else {
    bot.sendMessage(user.id, Text[user.language_code].wrong_wallet(commandList()))
  }
})

