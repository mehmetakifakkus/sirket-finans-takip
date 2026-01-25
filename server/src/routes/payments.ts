import { Router, Response } from 'express'
import { db } from '../database/connection.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler } from '../middleware/error.js'

const router = Router()

// GET /api/payments
router.get('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { relatedType, relatedId, startDate, endDate } = req.query

  let query = 'SELECT * FROM payments WHERE 1=1'
  const params: any[] = []
  let paramIndex = 1

  if (relatedType) {
    query += ` AND related_type = $${paramIndex++}`
    params.push(relatedType)
  }
  if (relatedId) {
    query += ` AND related_id = $${paramIndex++}`
    params.push(relatedId)
  }
  if (startDate) {
    query += ` AND date >= $${paramIndex++}`
    params.push(startDate)
  }
  if (endDate) {
    query += ` AND date <= $${paramIndex++}`
    params.push(endDate)
  }

  query += ' ORDER BY date DESC, id DESC'

  const payments = await db.query(query, params)
  res.json(payments)
}))

// DELETE /api/payments/:id
router.delete('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  // Get payment info before deleting
  const payment = await db.queryOne<{ related_type: string; related_id: number; amount: number }>(
    'SELECT related_type, related_id, amount FROM payments WHERE id = $1',
    [id]
  )

  if (payment && payment.related_type === 'installment') {
    // Revert installment paid_amount
    await db.execute(`
      UPDATE installments SET
        paid_amount = paid_amount - $1,
        status = CASE WHEN paid_amount - $1 <= 0 THEN 'pending' ELSE 'partial' END,
        updated_at = NOW()
      WHERE id = $2
    `, [payment.amount, payment.related_id])
  }

  await db.execute('DELETE FROM payments WHERE id = $1', [id])

  res.json({ success: true, message: 'Ödeme silindi' })
}))

export default router
