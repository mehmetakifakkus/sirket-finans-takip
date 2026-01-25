import app from './app.js'
import config from './config.js'
import { db } from './database/connection.js'
import { runMigrations } from './database/migrations.js'

async function startServer(): Promise<void> {
  try {
    // Test database connection
    await db.query('SELECT 1')
    console.log('Database connection established')

    // Run migrations
    await runMigrations()

    // Start server
    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`)
      console.log(`Environment: ${config.nodeEnv}`)
      console.log(`CORS origin: ${config.cors.origin}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...')
  await db.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...')
  await db.close()
  process.exit(0)
})

startServer()
