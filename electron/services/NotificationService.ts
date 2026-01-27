import { Notification, BrowserWindow } from 'electron'
import type { Database } from 'better-sqlite3'

interface UpcomingPayment {
  id: number
  type: 'debt' | 'receivable'
  party_name: string
  amount: number
  currency: string
  due_date: string
  days_until_due: number
}

interface NotificationSettings {
  enabled: boolean
  reminderDays: number[]  // e.g., [1, 3, 7] for 1, 3, and 7 days before
  showOverdue: boolean
}

export class NotificationService {
  constructor(private db: Database) {}

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  private formatCurrency(amount: number, currency: string): string {
    const symbols: Record<string, string> = { TRY: 'TL', USD: '$', EUR: 'EUR' }
    const symbol = symbols[currency] || currency
    return `${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(amount)} ${symbol}`
  }

  getUpcomingPayments(daysAhead: number = 7): UpcomingPayment[] {
    const today = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + daysAhead)

    const todayStr = today.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Get upcoming installments
    const installments = this.db.prepare(`
      SELECT
        i.id,
        d.kind as type,
        p.name as party_name,
        i.amount,
        d.currency,
        i.due_date,
        CAST(julianday(i.due_date) - julianday(?) AS INTEGER) as days_until_due
      FROM installments i
      JOIN debts d ON i.debt_id = d.id
      LEFT JOIN parties p ON d.party_id = p.id
      WHERE i.status != 'paid'
        AND d.status = 'open'
        AND i.due_date >= ?
        AND i.due_date <= ?
      ORDER BY i.due_date ASC
    `).all(todayStr, todayStr, endDateStr) as UpcomingPayment[]

    return installments.map(i => ({
      ...i,
      type: i.type === 'debt' ? 'debt' : 'receivable'
    }))
  }

  getOverduePayments(): UpcomingPayment[] {
    const todayStr = new Date().toISOString().split('T')[0]

    const installments = this.db.prepare(`
      SELECT
        i.id,
        d.kind as type,
        p.name as party_name,
        i.amount - COALESCE((
          SELECT SUM(pay.amount) FROM payments pay
          WHERE pay.related_id = i.id AND pay.related_type = 'installment'
        ), 0) as amount,
        d.currency,
        i.due_date,
        CAST(julianday(?) - julianday(i.due_date) AS INTEGER) as days_until_due
      FROM installments i
      JOIN debts d ON i.debt_id = d.id
      LEFT JOIN parties p ON d.party_id = p.id
      WHERE i.status != 'paid'
        AND d.status = 'open'
        AND i.due_date < ?
      ORDER BY i.due_date ASC
    `).all(todayStr, todayStr) as UpcomingPayment[]

    return installments.map(i => ({
      ...i,
      type: i.type === 'debt' ? 'debt' : 'receivable',
      days_until_due: -Math.abs(i.days_until_due) // Make negative for overdue
    }))
  }

  showNotification(
    title: string,
    body: string,
    onClick?: () => void
  ): void {
    if (!Notification.isSupported()) {
      console.log('Notifications not supported on this platform')
      return
    }

    const notification = new Notification({
      title,
      body,
      icon: undefined, // Can add app icon path here
      silent: false,
    })

    if (onClick) {
      notification.on('click', onClick)
    }

    notification.show()
  }

  checkAndNotify(
    settings: NotificationSettings,
    mainWindow: BrowserWindow | null,
    translations: {
      overdueTitle: string
      overdueBody: string
      upcomingTitle: string
      upcomingBody: string
      debtLabel: string
      receivableLabel: string
    }
  ): { upcoming: UpcomingPayment[], overdue: UpcomingPayment[] } {
    if (!settings.enabled) {
      return { upcoming: [], overdue: [] }
    }

    const maxDays = Math.max(...settings.reminderDays, 0)
    const upcoming = this.getUpcomingPayments(maxDays)
    const overdue = settings.showOverdue ? this.getOverduePayments() : []

    // Show overdue notification
    if (overdue.length > 0) {
      const overdueDebt = overdue.filter(p => p.type === 'debt').length
      const overdueReceivable = overdue.filter(p => p.type === 'receivable').length

      let body = translations.overdueBody
        .replace('{{count}}', overdue.length.toString())

      if (overdueDebt > 0) {
        body += `\n${overdueDebt} ${translations.debtLabel}`
      }
      if (overdueReceivable > 0) {
        body += `\n${overdueReceivable} ${translations.receivableLabel}`
      }

      this.showNotification(
        translations.overdueTitle,
        body,
        () => {
          if (mainWindow) {
            mainWindow.show()
            mainWindow.focus()
            mainWindow.webContents.send('navigate', '/debts')
          }
        }
      )
    }

    // Show upcoming notifications for specific days
    for (const days of settings.reminderDays) {
      const todayPayments = upcoming.filter(p => p.days_until_due === days)

      if (todayPayments.length > 0) {
        const debtCount = todayPayments.filter(p => p.type === 'debt').length
        const receivableCount = todayPayments.filter(p => p.type === 'receivable').length

        let body = translations.upcomingBody
          .replace('{{count}}', todayPayments.length.toString())
          .replace('{{days}}', days.toString())

        if (debtCount > 0) {
          body += `\n${debtCount} ${translations.debtLabel}`
        }
        if (receivableCount > 0) {
          body += `\n${receivableCount} ${translations.receivableLabel}`
        }

        this.showNotification(
          translations.upcomingTitle,
          body,
          () => {
            if (mainWindow) {
              mainWindow.show()
              mainWindow.focus()
              mainWindow.webContents.send('navigate', '/debts')
            }
          }
        )
      }
    }

    return { upcoming, overdue }
  }

  getPaymentSummary(): {
    overdueCount: number
    upcomingCount: number
    overdueAmount: number
    upcomingAmount: number
  } {
    const overdue = this.getOverduePayments()
    const upcoming = this.getUpcomingPayments(7)

    return {
      overdueCount: overdue.length,
      upcomingCount: upcoming.length,
      overdueAmount: overdue.reduce((sum, p) => sum + p.amount, 0),
      upcomingAmount: upcoming.reduce((sum, p) => sum + p.amount, 0)
    }
  }
}
