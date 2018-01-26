export const Text = {
  ru: {
    help: 'Я могу уведомлять тебя о изменениях баланса по твоим кошелькам. Пришли мне адрес waves кошелька (например: 3PBkqPd2chKH7uHViB3qkjKyYAJCSrsahbt) и ты начнешь получать уведомления о изменениях баланса.',
    wallet_added: (address) => `Кошелек ${address} добавлен.`,
    balance_changed: (address, balance) => `Баланс изменился ${address} -> ${balance}`,
    wrong_wallet: 'Нет никакого смысла в отправлять мне что - то помимо адреса waves кошелька, оставь это для Сири.',
    remove_wallet_question: (adderss) => `Хочешь перестать получать уведомления по кошельку: ${adderss}?`,
    button_yes: 'Да',
    button_no: 'Нет',
    wallet_removed: (adderss) => `Уведомления для ${adderss} отключены.`,
    done: 'Сделано!'
  },
  en: {
    help: `Hey! I can notify you about balance changes of your wallets. Send me a waves wallet address (example: 3PBkqPd2chKH7uHViB3qkjKyYAJCSrsahbt) and I will start to notify you.`,
    wallet_added: (address) => `Wallet ${address} added.`,
    balance_changed: (address, balance) => `Balance changed ${address} -> ${balance}`,
    wrong_wallet: 'There is no point of sending me something that is not a waves wallet address, keep it for Siri.',
    remove_wallet_question: (adderss) => `Do you want to disable nofitications for: ${adderss}?`,
    button_yes: 'Yes',
    button_no: 'No',
    wallet_removed: (adderss) => `Notification for ${adderss} are disabled.`,
    done: 'Done!'
  }
}