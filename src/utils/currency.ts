import { Currency, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '../types'

export function formatCurrency(amount: number | string | undefined | null, currency: Currency = 'TRY'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  // Parse string values and round to 2 decimal places
  let value = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0)
  value = Math.round(value * 100) / 100
  const formatted = value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return `${formatted} ${symbol}`
}

export function formatNumber(amount: number | undefined | null): string {
  const value = amount ?? 0
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function getCurrencySymbol(currency: Currency): string {
  return CURRENCY_SYMBOLS[currency] || currency
}

export function getCurrencyName(currency: Currency): string {
  return CURRENCY_NAMES[currency] || currency
}

export function getCurrencyOptions(): { value: Currency; label: string }[] {
  return [
    { value: 'TRY', label: 'TRY - Türk Lirası' },
    { value: 'USD', label: 'USD - Amerikan Doları' },
    { value: 'EUR', label: 'EUR - Euro' }
  ]
}

export function getCurrencyClass(currency: Currency): string {
  const classes: Record<Currency, string> = {
    TRY: 'text-gray-800',
    USD: 'text-green-600',
    EUR: 'text-blue-600',
    GR: 'text-yellow-600'
  }
  return classes[currency] || 'text-gray-800'
}

export function parseAmount(value: string): number {
  // Remove thousand separators and convert decimal separator
  const cleaned = value.replace(/\./g, '').replace(',', '.')
  return parseFloat(cleaned) || 0
}
