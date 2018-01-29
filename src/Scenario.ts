import * as TelegramBot from 'node-telegram-bot-api'
import { Database } from './Database'
import { Text } from './Text'
import { WavesNotifications } from './WavesNotifications'
import * as uuid from 'uuid/v4'
import { validateAddress } from './WavesCrypto';
import { Secret } from './Secret';
import { IDictionary } from './Interfaces/IDictionary';


const db = Database()
const bot = new TelegramBot(Secret.telegrammToken, { polling: true });

const page = {
  onLoad() {

  }
}
