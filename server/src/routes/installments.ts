import { Router, Response } from 'express'
import { db } from '../database/connection.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, NotFoundError } from '../middleware/error.js'

const router = Router()

// GET /api/installments/:id
router.get('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const installment = await db.queryOne(`
    SELECT i.*,
           d.kind as debt_kind,
           d.party_id,
           p.name as party_name
    FROM installments i
    LEFT JOIN debts d ON i.debt_id = d.id
    LEFT JOIN parties p ON d.party_id = p.id
    WHERE i.id = $1
  `, [id])

  if (!installment) {
    throw new NotFoundError('Taksit bulunamadı')
  }

  res.json(installment)
}))

// PUT /api/installments/:id
router.put('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { due_date, amount, currency, status, paid_amount, notes } = req.body

  await db.execute(`
    UPDATE installments SET
      due_date = $1, amount = $2, currency = $3, status = $4,
      paid_amount = $5, notes = $6, updated_at = NOW()
    WHERE id = $7
  `, [due_date, amount, currency || 'TRY', status || 'pending', paid_amount || 0, notes || null, id])

  res.json({ success: true, message: 'Taksit güncellendi' })
}))

// DELETE /api/installments/:id
router.delete('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  await db.execute('DELETE FROM installments WHERE id = $1', [id])

  res.json({ success: true, message: 'Taksit silindi' })
}))

// POST /api/installments/:id/payment
router.post('/:id/payment', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { date, amount, method, notes } = req.body

  // Get installment
  const installment = await db.queryOne<{
    debt_id: number
    amount: number
    paid_amount: number
    currency: string
  }>('SELECT debt_id, amount, paid_amount, currency FROM installments WHERE id = $1', [id])

  if (!installment) {
    throw new NotFoundError('Taksit bulunamadı')
  }

  const newPaidAmount = Number(installment.paid_amount) + Number(amount)
  const newStatus = newPaidAmount >= Number(installment.amount) ? 'paid' : 'partial'

  // Update installment
  await db.execute(`
    UPDATE installments SET paid_amount = $1, status = $2, updated_at = NOW() WHERE id = $3
  `, [newPaidAmount, newStatus, id])

  // Create payment record
  await db.execute(`
    INSERT INTO payments (related_type, related_id, date, amount, currency, method, notes, created_at, updated_at)
    VALUES ('installment', $1, $2, $3, $4, $5, $6, NOW(), NOW())
  `, [id, date, amount, installment.currency, method || 'bank', notes || null])

  // Check if all installments are paid and update debt status
  const unpaid = await db.queryOne<{ count: string }>(
    "SELECT COUNT(*) as count FROM installments WHERE debt_id = $1 AND status != 'paid'",
    [installment.debt_id]
  )

  if (unpaid && parseInt(unpaid.count) === 0) {
    await db.execute("UPDATE debts SET status = 'closed', updated_at = NOW() WHERE id = $1", [installment.debt_id])
  }

  res.json({ success: true, message: 'Ödeme kaydedildi' })
}))

export default router
