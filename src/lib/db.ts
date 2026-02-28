import { createClient, type Client } from '@libsql/client'
import path from 'path'

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'voting.db')

let _client: Client | null = null

export function getDb(): Client {
  if (!_client) {
    _client = createClient({ url: `file:${dbPath}` })
  }
  return _client
}

export default getDb
