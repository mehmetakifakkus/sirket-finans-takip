import { format, parseISO, isValid } from 'date-fns'
import { tr } from 'date-fns/locale'

export function formatDate(date: string | Date | null | undefined, formatStr: string = 'dd.MM.yyyy'): string {
  if (!date) return '-'

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return '-'
    return format(dateObj, formatStr, { locale: tr })
  } catch {
    return '-'
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'dd.MM.yyyy HH:mm')
}

export function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return ''

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return ''
    return format(dateObj, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getFirstDayOfMonth(): string {
  const now = new Date()
  return format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd')
}

export function getLastDayOfMonth(): string {
  const now = new Date()
  return format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd')
}

export function getMonthName(monthIndex: number): string {
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ]
  return months[monthIndex] || ''
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false

  try {
    const due = parseISO(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return due < today
  } catch {
    return false
  }
}

export function getDaysUntilDue(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null

  try {
    const due = parseISO(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  } catch {
    return null
  }
}
