import { DatabaseWrapper, getCurrentTimestamp } from '../database/connection'
import https from 'https'

interface ExchangeRate {
  id: number
  rate_date: string
  base_currency: string
  quote_currency: string
  rate: number
  source: string
  created_at: string
}

export class ExchangeRateService {
  private db: DatabaseWrapper

  constructor(db: DatabaseWrapper) {
    this.db = db
  }

  getAll(): ExchangeRate[] {
    return this.db.prepare(`
      SELECT * FROM exchange_rates
      ORDER BY rate_date DESC, quote_currency
    `).all() as ExchangeRate[]
  }

  getById(id: number): ExchangeRate | null {
    const rate = this.db.prepare('SELECT * FROM exchange_rates WHERE id = ?').get(id) as ExchangeRate | undefined
    return rate || null
  }

  getLatestRates(): Record<string, { rate: number; date: string }> {
    const rates: Record<string, { rate: number; date: string }> = {}

    for (const currency of ['USD', 'EUR', 'GR']) {
      const rate = this.db.prepare(`
        SELECT rate, rate_date FROM exchange_rates
        WHERE quote_currency = ?
        ORDER BY rate_date DESC
        LIMIT 1
      `).get(currency) as { rate: number; rate_date: string } | undefined

      if (rate) {
        rates[currency] = { rate: rate.rate, date: rate.rate_date }
      }
    }

    return rates
  }

  create(data: { rate_date: string; quote_currency: string; rate: number }): { success: boolean; message: string; id?: number } {
    const now = getCurrentTimestamp()

    try {
      const result = this.db.prepare(`
        INSERT OR REPLACE INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
        VALUES (?, 'TRY', ?, ?, 'manual', ?)
      `).run(data.rate_date, data.quote_currency, data.rate, now)

      return { success: true, message: 'Döviz kuru başarıyla eklendi.', id: Number(result.lastInsertRowid) }
    } catch {
      return { success: false, message: 'Döviz kuru eklenemedi.' }
    }
  }

  update(id: number, data: { rate_date: string; quote_currency: string; rate: number }): { success: boolean; message: string } {
    const existing = this.getById(id)

    if (!existing) {
      return { success: false, message: 'Döviz kuru bulunamadı.' }
    }

    try {
      this.db.prepare(`
        UPDATE exchange_rates SET rate_date = ?, quote_currency = ?, rate = ?
        WHERE id = ?
      `).run(data.rate_date, data.quote_currency, data.rate, id)

      return { success: true, message: 'Döviz kuru başarıyla güncellendi.' }
    } catch {
      return { success: false, message: 'Döviz kuru güncellenemedi.' }
    }
  }

  delete(id: number): { success: boolean; message: string } {
    const rate = this.getById(id)

    if (!rate) {
      return { success: false, message: 'Döviz kuru bulunamadı.' }
    }

    try {
      this.db.prepare('DELETE FROM exchange_rates WHERE id = ?').run(id)
      return { success: true, message: 'Döviz kuru başarıyla silindi.' }
    } catch {
      return { success: false, message: 'Döviz kuru silinemedi.' }
    }
  }

  async fetchFromTCMB(): Promise<{ success: boolean; message: string; rates?: Record<string, number>; date?: string }> {
    return new Promise((resolve) => {
      const url = 'https://www.tcmb.gov.tr/kurlar/today.xml'

      const req = https.get(url, { timeout: 10000 }, (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          try {
            const result = this.parseTCMBXML(data)
            resolve(result)
          } catch {
            resolve({ success: false, message: 'XML verisi işlenemedi.' })
          }
        })
      })

      req.on('error', () => {
        resolve({ success: false, message: 'TCMB verilerine ulaşılamadı.' })
      })

      req.on('timeout', () => {
        req.destroy()
        resolve({ success: false, message: 'Bağlantı zaman aşımına uğradı.' })
      })
    })
  }

  private parseTCMBXML(xml: string): { success: boolean; message: string; rates?: Record<string, number>; date?: string } {
    const now = getCurrentTimestamp()
    const rates: Record<string, number> = {}

    // Extract date from XML - TCMB format is DD/MM/YYYY
    const dateMatch = xml.match(/Date="(\d{2})\/(\d{2})\/(\d{4})"/)
    if (!dateMatch) {
      return { success: false, message: 'Tarih bilgisi okunamadı.' }
    }

    const [, day, month, year] = dateMatch
    const date = `${year}-${month}-${day}`

    // Extract USD rate
    const usdMatch = xml.match(/<Currency.*?CurrencyCode="USD".*?>[\s\S]*?<ForexSelling>([\d.]+)<\/ForexSelling>[\s\S]*?<\/Currency>/)
    if (usdMatch) {
      const usdRate = parseFloat(usdMatch[1])
      if (usdRate > 0) {
        rates['USD'] = usdRate
        this.upsertRate(date, 'USD', usdRate, 'tcmb')
      }
    }

    // Extract EUR rate
    const eurMatch = xml.match(/<Currency.*?CurrencyCode="EUR".*?>[\s\S]*?<ForexSelling>([\d.]+)<\/ForexSelling>[\s\S]*?<\/Currency>/)
    if (eurMatch) {
      const eurRate = parseFloat(eurMatch[1])
      if (eurRate > 0) {
        rates['EUR'] = eurRate
        this.upsertRate(date, 'EUR', eurRate, 'tcmb')
      }
    }

    if (Object.keys(rates).length === 0) {
      return { success: false, message: 'Kur bilgisi bulunamadı.' }
    }

    return {
      success: true,
      message: 'Kurlar başarıyla güncellendi.',
      rates,
      date
    }
  }

  private upsertRate(date: string, currency: string, rate: number, source: string): void {
    const now = getCurrentTimestamp()

    this.db.prepare(`
      INSERT OR REPLACE INTO exchange_rates (rate_date, base_currency, quote_currency, rate, source, created_at)
      VALUES (?, 'TRY', ?, ?, ?, ?)
    `).run(date, currency, rate, source, now)
  }

  async fetchGoldPrice(): Promise<{ success: boolean; message: string; rate?: number; date?: string }> {
    return new Promise((resolve) => {
      const url = 'https://finans.truncgil.com/today.json'

      const req = https.get(url, { timeout: 10000 }, (res) => {
        // Check for HTTP errors
        if (res.statusCode !== 200) {
          resolve({ success: false, message: `HTTP hatası: ${res.statusCode}` })
          return
        }

        // Set encoding to UTF-8
        res.setEncoding('utf8')

        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          try {
            const result = this.parseGoldPriceJSON(data)
            resolve(result)
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Bilinmeyen hata'
            resolve({ success: false, message: `Altın fiyatı verisi işlenemedi: ${errorMsg}` })
          }
        })
      })

      req.on('error', (err) => {
        resolve({ success: false, message: `Bağlantı hatası: ${err.message}` })
      })

      req.on('timeout', () => {
        req.destroy()
        resolve({ success: false, message: 'Bağlantı zaman aşımına uğradı.' })
      })
    })
  }

  private parseGoldPriceJSON(json: string): { success: boolean; message: string; rate?: number; date?: string } {
    const data = JSON.parse(json)

    // Get gram-altin (Gram Gold) entry
    const goldEntry = data['gram-altin']

    if (!goldEntry) {
      return { success: false, message: 'Altın fiyatı bulunamadı.' }
    }

    // Find the selling price key (might be "Satış" or "Satis" depending on encoding)
    let satisStr: string | undefined
    for (const key of Object.keys(goldEntry)) {
      if (key.toLowerCase().startsWith('sat')) {
        satisStr = goldEntry[key]
        break
      }
    }

    if (!satisStr) {
      return { success: false, message: `Satış fiyatı bulunamadı. Keys: ${Object.keys(goldEntry).join(', ')}` }
    }

    // Convert Turkish format to number: "6.675,89" -> 6675.89
    const rate = parseFloat(satisStr.replace(/\./g, '').replace(',', '.'))
    if (!rate || rate <= 0 || isNaN(rate)) {
      return { success: false, message: `Geçersiz altın fiyatı: ${satisStr}` }
    }

    // Extract date from Update_Date field or use today
    let date: string
    if (data['Update_Date']) {
      // Format: "2026-01-22 08:30:02"
      date = data['Update_Date'].split(' ')[0]
    } else {
      date = new Date().toISOString().split('T')[0]
    }

    this.upsertRate(date, 'GR', rate, 'kapali-carsi')

    return {
      success: true,
      message: 'Altın fiyatı başarıyla güncellendi.',
      rate,
      date
    }
  }
}
