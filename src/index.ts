import * as TelegramBot from 'node-telegram-bot-api'
import { Database } from './Database'
import { Text } from './Text'
import { WavesNotifications } from './WavesNotifications'
import * as uuid from 'uuid/v4'
import { validateAddress } from './WavesCrypto';
import { Secret } from './Secret';
import { IDictionary } from './Interfaces/IDictionary';
import { IAsset } from './Interfaces/IAsset';


const db = Database()
const bot = new TelegramBot(Secret.telegrammToken, { polling: true });
const wn = WavesNotifications(() => db.getWallets())
const commands = {
  help: '/help',
  language: '/language',
  wallets: '/wallets'
}

const subsctiptionCommands = {
  togge: 'toggle',
  remove: 'remove',
  edit: 'edit',
}

const printAsset = (asset: IAsset, balance: string) => {
  const b = balance.toString()
  const bal = b.substr(0, b.length - asset.decimals) + "." + b.substr(b.length - asset.decimals)
  return (bal.startsWith('.') ? '0' : '') + bal + ' ' + asset.alias
}

const userAndAddressForRename = {}

const callbacks = {
  build: (command, ...params: any[]) => `${command}/${params.join('/')}`,
  check: async <TContext>(callback: TelegramBot.CallbackQuery, contextBuilder: () => Promise<TContext>, commandsWithHandlers: IDictionary<(context: TContext, ...params: any[]) => void>) => {

    const commandsToExecute = Object.keys(commandsWithHandlers).map(command => {
      const params = callback.data.startsWith(command + '/') ? callback.data.substr(command.length + 1).split('/') : undefined
      return { command, params }
    }).filter(x => x.params)

    if (commandsToExecute && commandsToExecute[0]) {
      const context = await contextBuilder()
      commandsWithHandlers[commandsToExecute[0].command](context, ...commandsToExecute[0].params)
    }
  }
}

const commandList = () =>
  Object.keys(commands).map(k => commands[k]).join('  ')

const walletsKeyboardForUser = async (userId) => {
  const inline_keyboard = []
  const subscriptions = await db.getUserSubscriptions(userId)
  if (subscriptions && subscriptions.length > 0) {
    const arr = subscriptions.map(s => {
      console.log(s)
      const buttonText = `${s.disabled ? '⚪' : '🔵'}  ${s.alias ? s.alias : s.address}`
      return [
        [{
          text: buttonText,
          callback_data: callbacks.build(subsctiptionCommands.togge, s.address)
        }],
        [{
          text: '✏',
          callback_data: callbacks.build(subsctiptionCommands.edit, s.address)
        },
        {
          text: '❌',
          callback_data: callbacks.build(subsctiptionCommands.remove, s.address)
        }]]
    })
    arr.forEach(a => { inline_keyboard.push(a[0]); inline_keyboard.push(a[1]) })
  }
  return inline_keyboard
}

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

  const subs = await db.getAddressSubscriptions(address)
  if (subs && subs.length > 0) {

    const oldNewPairs = await Promise.all(Object.keys(balances).map(assetId => db.updateBalance(address, assetId, balances[assetId])))

    const prints = await Promise.all(
    oldNewPairs.filter(p => !p.$old || p.$old.$balance != p.$new.$balance).map(async p => {
      const asset = await db.getAsset(p.$new.$assetId)
      return printAsset(asset, p.$new.$balance.toString())
    }))
    
    if (prints.length > 0) {
      subs.forEach(async id => {
        const user = await db.getUser(id.userId)
        const a = id.alias ? id.alias : address
        bot.sendMessage(id.userId, `*${a}*\n${prints.join('\n')}`, { parse_mode: 'Markdown' })
      })
    }
  }
})

bot.on('message', async (msg) => {
  const from = msg.from
  await db.addUser(from.id, from.is_bot == 'true' ? 1 : 0, from.first_name, from.last_name, from.username, from.language_code)
  const user = await db.getUser(from.id)

  const addressForRename = userAndAddressForRename[user.id]
  if (addressForRename) {
    delete userAndAddressForRename[user.id]
    const subscriptions = await db.getUserSubscriptions(user.id)
    const s = subscriptions.filter(s => s.address == addressForRename)
    if (s.length == 1) {
      s[0].alias = msg.text
      await db.updateUserSubscription(s[0])
      bot.sendMessage(user.id, Text[user.language_code].wallet_renamed(s[0].address, s[0].alias))
    }
    return
  }

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

    const keyboard = await walletsKeyboardForUser(user.id)
    if (keyboard.length > 0) {
      const message = await bot.sendMessage(user.id, 'Manage your wallets:', { reply_markup: { inline_keyboard: keyboard } })
    }
    else {
      bot.sendMessage(user.id, 'No wallets yet. You can send me waves wallet addres to enable notifications.')
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

bot.on('callback_query', async (callback: TelegramBot.CallbackQuery) => {
  callbacks.check(callback, () => db.getUser(callback.from.id.toString()),
    {
      remove: async (user, address) => {
        await db.removeSubscription(address, user.id)
        bot.answerCallbackQuery({ callback_query_id: callback.id, text: Text[user.language_code].wallet_removed })
        const keyboard = await walletsKeyboardForUser(user.id)
        bot.editMessageReplyMarkup({ inline_keyboard: keyboard }, { chat_id: user.id, message_id: callback.message.message_id })
      },
      toggle: async (user, address) => {
        const subscriptions = await db.getUserSubscriptions(user.id)
        const s = subscriptions.filter(s => s.address == address)
        if (s.length == 1) {
          if (!s[0].disabled || s[0].disabled == 0) {
            s[0].disabled = 1
          }
          else {
            s[0].disabled = 0
          }
          await db.updateUserSubscription(s[0])
          const keyboard = await walletsKeyboardForUser(user.id)
          bot.answerCallbackQuery({ callback_query_id: callback.id, text: s[0].disabled ? Text[user.language_code].wallet_disabled : Text[user.language_code].wallet_enabled })
          bot.editMessageReplyMarkup({ inline_keyboard: keyboard }, { chat_id: user.id, message_id: callback.message.message_id })
        }
      },
      edit: (user, address) => {
        userAndAddressForRename[user.id] = address
        bot.sendMessage(user.id, Text[user.language_code].wallet_rename_description)
        bot.answerCallbackQuery({ callback_query_id: callback.id })
      },
    })
})
