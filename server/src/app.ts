import express from 'express'
import cors from 'cors'
import config from './config.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'

// Import routes
import authRoutes from './routes/auth.js'
import transactionRoutes from './routes/transactions.js'
import debtRoutes from './routes/debts.js'
import installmentRoutes from './routes/installments.js'
import partyRoutes from './routes/parties.js'
import categoryRoutes from './routes/categories.js'
import projectRoutes from './routes/projects.js'
import milestoneRoutes from './routes/milestones.js'
import grantRoutes from './routes/grants.js'
import paymentRoutes from './routes/payments.js'
import exchangeRateRoutes from './routes/exchangeRates.js'
import userRoutes from './routes/users.js'
import reportRoutes from './routes/reports.js'
import documentRoutes from './routes/documents.js'
import fileRoutes from './routes/files.js'
import setupRoutes from './routes/setup.js'
import importRoutes from './routes/import.js'
import databaseRoutes from './routes/database.js'

const app = express()

// Middleware
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/transactions', transactionRoutes)
app.use('/api/debts', debtRoutes)
app.use('/api/installments', installmentRoutes)
app.use('/api/parties', partyRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/projects', projectRoutes)
app.use('/api/milestones', milestoneRoutes)
app.use('/api/grants', grantRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/exchange-rates', exchangeRateRoutes)
app.use('/api/users', userRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/documents', documentRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/setup', setupRoutes)
app.use('/api/import', importRoutes)
app.use('/api/database', databaseRoutes)

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

export default app
