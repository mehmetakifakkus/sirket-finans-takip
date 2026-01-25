import { Pool, PoolClient, QueryResult } from 'pg'
import config from '../config.js'

// Create PostgreSQL connection pool
const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Wait 2 seconds for a connection
})

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// Database wrapper with utility methods
export class Database {
  // Execute a query and return all rows
  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await pool.query(text, params)
    return result.rows
  }

  // Execute a query and return the first row
  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const result = await pool.query(text, params)
    return result.rows[0] || null
  }

  // Execute a query and return the raw result
  async queryRaw(text: string, params?: any[]): Promise<QueryResult> {
    return pool.query(text, params)
  }

  // Execute a query (for INSERT/UPDATE/DELETE that don't return data)
  async execute(text: string, params?: any[]): Promise<QueryResult> {
    return pool.query(text, params)
  }

  // Get a client for transactions
  async getClient(): Promise<PoolClient> {
    return pool.connect()
  }

  // Run a function within a transaction
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const result = await fn(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  // Close the pool
  async close(): Promise<void> {
    await pool.end()
    console.log('Database pool closed')
  }
}

// Export singleton instance
export const db = new Database()
export default db
