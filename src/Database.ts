import { Database as sqlite } from 'sqlite3'

export const Database = () => {
  var db = new sqlite('./balance');

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS wallets (
    address TEXT PRIMARY KEY,
    userId TEXT,
    balance INTEGER)`)
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    is_bot INTEGER,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    language_code TEXT)`)
    db.run(`CREATE INDEX IF NOT EXISTS walletsByUser ON wallets(userId)`)
  })

  const dbSelect = <T>(sql: string, projection: (any) => T) : Promise<T[]> =>
    new Promise<T[]>((resolve, reject) => {
      db.all(sql, (err, rows) => {
        if (err)
          reject(err)
        else
          resolve(rows.map(projection))
      })
    })


  return {
    getWallets: (): Promise<string[]> =>
      dbSelect(`SELECT address FROM wallets`, x => x.address),

    getUserId: (address: string): Promise<string[]> =>
      dbSelect(`SELECT userId FROM wallets WHERE address = '${address}'`, x => x.userId),

    addWallet: ($address: string, $userId: string) => {
      db.run(`INSERT OR IGNORE INTO wallets (address, userId) VALUES ($address, $userId)`,
        { $address, $userId },
        (err) => {
          if (err)
            console.log(err)
          if (this.changes && this.changes > 0)
            console.log(`NEW WALLET -> ${$address}`)
        })
    }
  }
}