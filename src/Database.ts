import { Database as sqlite } from 'sqlite3'

export interface IUser {
  id,
  is_bot,
  first_name,
  last_name,
  username,
  language_code
}

export const Database = () => {
  var db = new sqlite('./balance');

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS wallets (
    address TEXT PRIMARY KEY,
    balance INTEGER)`)
    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    address TEXT,
    userId TEXT,
    alias TEXT,
    PRIMARY KEY (address, userId))`)
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    is_bot INTEGER,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    language_code TEXT)`)
  })

  const dbSelect = <T>(sql: string, projection: (any) => T): Promise<T[]> =>
    new Promise<T[]>((resolve, reject) => {
      db.all(sql, function (err, rows) {
        if (err)
          reject(err)
        else
          resolve(rows.map(projection))
      })
    })

  const dbGet = <T>(sql: string, projection: (any) => T): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      db.get(sql, function (err, row) {
        if (err)
          reject(err)
        else
          resolve(projection(row))
      })
    })


  let onNewSubscriptionHandler: (address: string, userId: string) => void

  return {
    getWallets: (): Promise<string[]> =>
      dbSelect(`SELECT address FROM wallets`, x => x.address),

    getUserIds: (address: string): Promise<string[]> =>
      dbSelect(`SELECT userId FROM subscriptions WHERE address = '${address}'`, x => x.userId),

    addWallet: ($address: string) =>
      db.run(`INSERT OR IGNORE INTO wallets (address) VALUES ($address)`,
        { $address },
        function (err) {
          if (err)
            console.log(err)
          if (this.changes && this.changes > 0)
            console.log(`NEW WALLET -> ${$address}`)
        }),

    addSubscription: ($address, $userId): Promise<boolean> => new Promise<boolean>((resolve, reject) => {
      db.run(`INSERT OR IGNORE INTO subscriptions (address, userId) VALUES ($address, $userId)`,
        { $address, $userId },
        function (err) {
          if (err) {
            console.log(err)
            reject(err)
          }
          if (this.changes && this.changes > 0) {
            console.log(`NEW SUBSCRIPTION -> ${$userId} to ${$address}`)
            if (onNewSubscriptionHandler)
              onNewSubscriptionHandler($address, $userId)

            resolve(true)
          }
          else {
            resolve(false)
          }
        })
    }),

    removeSubscription: ($address, $userId): Promise<boolean> => new Promise<boolean>((resolve, reject) => {
      db.run(`DELETE FROM subscriptions WHERE address = '${$address}' and userId = '${$userId}'`, function (err) {
        if (err) {
          reject(err)
        }
        else {
          if (this.changes && this.changes > 0) {
            console.log(`SUBSCRIPTION REMOVED -> ${$userId} to ${$address}`)
            resolve(true)
          } else {
            resolve(false)
          }
        }
      })
    }),

    addUser: ($id, $is_bot, $first_name, $last_name, $username, $language_code): Promise<IUser> =>
      new Promise(async (resolve, reject) => {
        const params = { $id, $is_bot, $first_name, $last_name, $username, $language_code }
        params.$language_code = new RegExp('ru', 'i').test(params.$language_code) ? 'ru' : 'en'
        db.run(`INSERT OR IGNORE INTO users (id, is_bot, first_name, last_name, username, language_code) VALUES ($id, $is_bot, $first_name, $last_name, $username, $language_code)`,
          params,
          function (err) {
            if (err) {
              reject(err)
            }
            else {
              if (this.changes && this.changes > 0) {
                console.log(`NEW USER -> ${params}`)
              }
              resolve({ id: $id, is_bot: $is_bot, first_name: $first_name, last_name: $last_name, username: $username, language_code: params.$language_code })
            }
          })
      }),

    updateUser: (user: IUser): Promise<IUser> =>
      new Promise<IUser>((resolve, reject) => {
        const sql = `UPDATE users SET is_bot = ${user.is_bot}, first_name = '${user.first_name}', last_name = '${user.last_name}', username = '${user.username}', language_code = '${user.language_code}' WHERE id = '${user.id}'`
        console.log(sql)
        db.run(sql, function (err) {
          if (err) {
            reject(err)
          }
          else {
            if (this.changes && this.changes > 0) {
              console.log(`USER UPDATED -> ${user.id}, language_code: ${user.language_code}`)
            }
            resolve(user)
          }
        })
      }),

    getUser: (id): Promise<IUser> =>
      dbGet(`SELECT * from users WHERE id = '${id}'`, x => x),

    onNewSubscription: (handler: (address: string, userId: string) => void) => {
      onNewSubscriptionHandler = handler
    }
  }
}