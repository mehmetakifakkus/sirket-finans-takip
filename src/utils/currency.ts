import { Currency, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '../types'

export function formatCurrency(amount: number | string | undefined | null, currency: Currency = 'TRY'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  // Parse string values and round to nearest integer
  let value = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0)
  value = Math.round(value)
  const formatted = value.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  return `${formatted} ${symbol}`
}

export function formatNumber(amount: number | undefined | null): string {
  const value = Math.round(amount ?? 0)
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
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
