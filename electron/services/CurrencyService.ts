import Database from 'better-sqlite3'

interface ExchangeRate {
  id: number
  rate_date: string
  base_currency: string
  quote_currency: string
  rate: number
  source: string
  created_at: string
}

export class CurrencyService {
  private db: Database.Database

  static readonly CURRENCIES = ['TRY', 'USD', 'EUR']
  static readonly SYMBOLS: Record<string, string> = {
    TRY: '₺',
    USD: '$',
    EUR: '€'
  }
  static readonly NAMES: Record<string, string> = {
    TRY: 'Türk Lirası',
    USD: 'Amerikan Doları',
    EUR: 'Euro'
  }

  constructor(db: Database.Database) {
    this.db = db
  }

  convertToTRY(amount: number, currency: string, date: string): { amount_try: number; rate: number; warning?: string } {
    if (currency === 'TRY') {
      return { amount_try: amount, rate: 1 }
    }

    // Try to get rate for the exact date
    let rate = this.getRateForDate(date, currency)

    if (rate === null) {
      // Try to get the closest previous rate
      rate = this.getClosestRate(date, currency)

      if (rate === null) {
        // Use a default rate if nothing found
        rate = currency === 'USD' ? 32.5 : 35.2
        return {
          amount_try: amount * rate,
          rate,
          warning: `${date} tarihi için kur bulunamadı, varsayılan kur kullanıldı.`
        }
      }

      return {
        amount_try: amount * rate,
        rate,
        warning: `${date} tarihi için kur bulunamadı, en yakın tarih kurları kullanıldı.`
      }
    }

    return { amount_try: amount * rate, rate }
  }

  getRateForDate(date: string, currency: string): number | null {
    const rate = this.db.prepare(`
      SELECT rate FROM exchange_rates
      WHERE rate_date = ? AND quote_currency = ?
    `).get(date, currency) as { rate: number } | undefined

    return rate?.rate || null
  }

  getClosestRate(date: string, currency: string): number | null {
    const rate = this.db.prepare(`
      SELECT rate FROM exchange_rates
      WHERE rate_date <= ? AND quote_currency = ?
      ORDER BY rate_date DESC
      LIMIT 1
    `).get(date, currency) as { rate: number } | undefined

    return rate?.rate || null
  }

  getLatestRate(currency: string): number | null {
    const rate = this.db.prepare(`
      SELECT rate FROM exchange_rates
      WHERE quote_currency = ?
      ORDER BY rate_date DESC
      LIMIT 1
    `).get(currency) as { rate: number } | undefined

    return rate?.rate || null
  }

  getLatestRates(): Record<string, number> {
    const rates: Record<string, number> = { TRY: 1 }

    for (const currency of ['USD', 'EUR']) {
      const rate = this.getLatestRate(currency)
      if (rate !== null) {
        rates[currency] = rate
      }
    }

    return rates
  }

  getAllRates(): ExchangeRate[] {
    return this.db.prepare(`
      SELECT * FROM exchange_rates
      ORDER BY rate_date DESC, quote_currency
    `).all() as ExchangeRate[]
  }

  format(amount: number, currency: string = 'TRY'): string {
    const symbol = CurrencyService.SYMBOLS[currency] || currency
    const formatted = amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    return `${formatted} ${symbol}`
  }

  formatNumber(amount: number): string {
    return amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  getSymbol(currency: string): string {
    return CurrencyService.SYMBOLS[currency] || currency
  }

  getName(currency: string): string {
    return CurrencyService.NAMES[currency] || currency
  }

  isValidCurrency(currency: string): boolean {
    return CurrencyService.CURRENCIES.includes(currency)
  }
}
