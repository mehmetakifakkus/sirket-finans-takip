import { Router, Response } from 'express'
import { db } from '../database/connection.js'
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js'
import { asyncHandler, NotFoundError } from '../middleware/error.js'
import { format } from 'date-fns'

const router = Router()

// GET /api/exchange-rates
router.get('/', authMiddleware, asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const rates = await db.query('SELECT * FROM exchange_rates ORDER BY rate_date DESC, quote_currency ASC')
  res.json(rates)
}))

// GET /api/exchange-rates/latest
router.get('/latest', authMiddleware, asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  const rates = await db.query(`
    SELECT DISTINCT ON (quote_currency) *
    FROM exchange_rates
    ORDER BY quote_currency, rate_date DESC
  `)

  const ratesMap: Record<string, any> = {}
  rates.forEach((r: any) => {
    ratesMap[r.quote_currency] = r
  })

  res.json(ratesMap)
}))

// GET /api/exchange-rates/:id
router.get('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  const rate = await db.queryOne('SELECT * FROM exchange_rates WHERE id = $1', [id])

  if (!rate) {
    throw new NotFoundError('Kur bulunamadı')
  }

  res.json(rate)
}))

// POST /api/exchange-rates
router.post('/', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { rate_date, base_currency, quote_currency, rate, source } = req.body

  const result = await db.queryOne<{ id: number }>(`
    INSERT INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (rate_date, quote_currency) DO UPDATE SET rate = $4, source = $5, created_at = NOW()
    RETURNING id
  `, [rate_date, base_currency || 'TRY', quote_currency, rate, source || 'manual'])

  res.json({ success: true, message: 'Kur kaydedildi', id: result?.id })
}))

// PUT /api/exchange-rates/:id
router.put('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params
  const { rate_date, base_currency, quote_currency, rate, source } = req.body

  await db.execute(`
    UPDATE exchange_rates SET rate_date = $1, base_currency = $2, quote_currency = $3, rate = $4, source = $5
    WHERE id = $6
  `, [rate_date, base_currency || 'TRY', quote_currency, rate, source || 'manual', id])

  res.json({ success: true, message: 'Kur güncellendi' })
}))

// DELETE /api/exchange-rates/:id
router.delete('/:id', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params

  await db.execute('DELETE FROM exchange_rates WHERE id = $1', [id])

  res.json({ success: true, message: 'Kur silindi' })
}))

// POST /api/exchange-rates/fetch-tcmb
router.post('/fetch-tcmb', authMiddleware, asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const response = await fetch('https://www.tcmb.gov.tr/kurlar/today.xml')
    const xml = await response.text()

    // Parse XML (simple parsing for USD and EUR)
    const usdMatch = xml.match(/<Currency.*?Kod="USD".*?>[\s\S]*?<ForexSelling>([\d,]+)<\/ForexSelling>/i)
    const eurMatch = xml.match(/<Currency.*?Kod="EUR".*?>[\s\S]*?<ForexSelling>([\d,]+)<\/ForexSelling>/i)

    const rates: Record<string, number> = {}
    const today = format(new Date(), 'yyyy-MM-dd')

    if (usdMatch) {
      const usdRate = parseFloat(usdMatch[1].replace(',', '.'))
      rates['USD'] = usdRate
      await db.execute(`
        INSERT INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
        VALUES ($1, 'TRY', 'USD', $2, 'tcmb', NOW())
        ON CONFLICT (rate_date, quote_currency) DO UPDATE SET rate = $2, source = 'tcmb', created_at = NOW()
      `, [today, usdRate])
    }

    if (eurMatch) {
      const eurRate = parseFloat(eurMatch[1].replace(',', '.'))
      rates['EUR'] = eurRate
      await db.execute(`
        INSERT INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
        VALUES ($1, 'TRY', 'EUR', $2, 'tcmb', NOW())
        ON CONFLICT (rate_date, quote_currency) DO UPDATE SET rate = $2, source = 'tcmb', created_at = NOW()
      `, [today, eurRate])
    }

    res.json({ success: true, message: 'TCMB kurları güncellendi', rates })
  } catch (error) {
    res.json({ success: false, message: 'TCMB kurları alınamadı' })
  }
}))

// POST /api/exchange-rates/fetch-gold
router.post('/fetch-gold', authMiddleware, asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
  try {
    // Try to fetch gold price from a public API
    const response = await fetch('https://www.altinkaynak.com/Doviz/Kur/XAU')
    const html = await response.text()

    // Parse gold price from HTML (simplified)
    const match = html.match(/data-last="([\d,.]+)"/i)
    const today = format(new Date(), 'yyyy-MM-dd')

    if (match) {
      const rate = parseFloat(match[1].replace('.', '').replace(',', '.'))

      await db.execute(`
        INSERT INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
        VALUES ($1, 'TRY', 'XAU', $2, 'kapali-carsi', NOW())
        ON CONFLICT (rate_date, quote_currency) DO UPDATE SET rate = $2, source = 'kapali-carsi', created_at = NOW()
      `, [today, rate])

      res.json({ success: true, message: 'Altın kuru güncellendi', rate, date: today })
    } else {
      res.json({ success: false, message: 'Altın kuru alınamadı' })
    }
  } catch (error) {
    res.json({ success: false, message: 'Altın kuru alınamadı' })
  }
}))

export default router
