import { IDictionary } from "./Interfaces/IDictionary";

export const Text = {
  ru: {
    help: 'Я могу уведомлять тебя о изменениях баланса по кошелькам. Пришли мне адрес waves кошелька (например: 3PBkqPd2chKH7uHViB3qkjKyYAJCSrsahbt) и ты начнешь получать уведомления о изменениях баланса.',
    wallet_added: (address) => `Кошелек ${address} добавлен.`,
    balance_changed: (address, balance) => `Баланс изменился ${address} -> ${balance}`,
    asset_balance_changed: (address, asset, balance) => `Баланс ${address} изменился: ${asset} -> ${balance}`,
    wrong_wallet: (commands) => `Нет никакого смысла в отправлять мне что - то помимо адреса waves кошелька, оставь это для Сири.\nСписок команд: ${commands}.`,
    remove_wallet_question: (adderss) => `Хочешь перестать получать уведомления по кошельку: ${adderss}?`,
    button_yes: 'Да',
    button_no: 'Нет',
    button_ru: 'Ru',
    button_en: 'En',
    language_change_question: 'Меняем язык?',
    language_changed: (code) => `Язык изменен: ${code}`,
    wallet_removed: 'Кошелек удален.',
    wallet_disabled: 'Уведомления отключены.',
    wallet_enabled: 'Уведомления включены.',
    wallet_not_removed: 'Продолжаю слать уведомления.',
    wallet_rename_description: 'Отправь мне новое имя для кошелька?',
    wallet_renamed: (address, name) => `Кошелек ${address} теперь - ${name}`,
    address_not_valid: 'Похоже адрес неправильный, может это не waves? Попробуй проверить и повторить ;)'
  },
  en: {
    help: `Hey! I can notify you about balance changes of your wallets. Send me a waves wallet address (example: 3PBkqPd2chKH7uHViB3qkjKyYAJCSrsahbt) and I will start to notify you.`,
    wallet_added: (address) => `Wallet ${address} added.`,
    balance_changed: (address, balance) => `Balance changed ${address} -> ${balance}`,
    asset_balance_changed: (address, asset, balance) => `Balance ${address} changed: ${asset} -> ${balance}`,
    wrong_wallet: (commands) => `There is no point of sending me something that is not a waves wallet address, keep it for Siri.\nTry one of these: ${commands}.`,
    remove_wallet_question: (adderss) => `Do you want to disable nofitications for: ${adderss}?`,
    button_yes: 'Yes',
    button_no: 'No',
    button_ru: 'Ru',
    button_en: 'En',
    language_change_question: 'Choose language:',
    language_changed: (code) => `Language changed: ${code}`,
    wallet_removed: 'Wallet removed.',
    wallet_disabled: 'Notifications disabled.',
    wallet_enabled: 'Notifications enabled.',
    wallet_not_removed: 'Notifications remain enabled.',
    wallet_rename_description: 'Send me new wallet name?',
    wallet_renamed: (address, name) => `Wallet ${address} is now - ${name}`,
    address_not_valid: 'It seems that address is not a valid one or maybe it`s not a waves wallet? Double-check everything and try again ;)'
  }
}