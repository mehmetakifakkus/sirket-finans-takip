import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { useSettingsStore } from '../store/settingsStore'
import { formatCurrency } from '../utils/currency'
import { formatDate, isOverdue } from '../utils/date'

interface UpcomingPayment {
  id: number
  type: 'debt' | 'receivable'
  party_name: string
  amount: number
  currency: string
  due_date: string
  days_until_due: number
}

interface PaymentSummary {
  overdueCount: number
  upcomingCount: number
  overdueAmount: number
  upcomingAmount: number
}

const REMINDER_OPTIONS = [1, 3, 7, 14, 30]

export function PaymentReminders() {
  const { t } = useTranslation()
  const { notifications, setNotificationEnabled, setReminderDays, setShowOverdue } = useSettingsStore()

  const [loading, setLoading] = useState(true)
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([])
  const [overduePayments, setOverduePayments] = useState<UpcomingPayment[]>([])
  const [summary, setSummary] = useState<PaymentSummary | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [upcoming, overdue, summaryData] = await Promise.all([
        api.getUpcomingPayments(30),
        api.getOverduePayments(),
        api.getPaymentSummary()
      ])
      setUpcomingPayments(upcoming as UpcomingPayment[])
      setOverduePayments(overdue as UpcomingPayment[])
      setSummary(summaryData)
    } catch (error) {
      console.error('Failed to load payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReminderDayToggle = (day: number) => {
    const currentDays = notifications.reminderDays
    if (currentDays.includes(day)) {
      setReminderDays(currentDays.filter(d => d !== day))
    } else {
      setReminderDays([...currentDays, day].sort((a, b) => a - b))
    }
  }

  const getDaysLabel = (days: number) => {
    if (days === 0) return t('reminders.today')
    if (days === 1) return t('reminders.tomorrow')
    if (days < 0) return t('reminders.daysOverdue', { days: Math.abs(days) })
    return t('reminders.daysUntil', { days })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('reminders.title')}</h1>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{t('reminders.overdueCount')}</p>
                <p className="text-2xl font-bold text-red-600">{summary.overdueCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{t('reminders.overdueAmount')}</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(summary.overdueAmount, 'TRY')}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-amber-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{t('reminders.upcomingCount')}</p>
                <p className="text-2xl font-bold text-amber-600">{summary.upcomingCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-amber-200 p-4">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{t('reminders.upcomingAmount')}</p>
                <p className="text-xl font-bold text-amber-600">{formatCurrency(summary.upcomingAmount, 'TRY')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notification Settings */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('reminders.settingsTitle')}</h2>
            <p className="text-sm text-gray-500 mb-6">{t('reminders.settingsDescription')}</p>

            <div className="space-y-6">
              {/* Enable Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    {t('settings.notifications.enabled')}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationEnabled(!notifications.enabled)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    notifications.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notifications.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {notifications.enabled && (
                <>
                  {/* Show Overdue */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        {t('settings.notifications.showOverdue')}
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowOverdue(!notifications.showOverdue)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        notifications.showOverdue ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifications.showOverdue ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Reminder Days */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('settings.notifications.reminderDays')}
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      {t('settings.notifications.reminderDaysDesc')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {REMINDER_OPTIONS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleReminderDayToggle(day)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            notifications.reminderDays.includes(day)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {day} {day === 1 ? t('settings.notifications.day') : t('settings.notifications.days')}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payment Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overdue Payments */}
          {overduePayments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-red-200">
              <div className="px-6 py-4 border-b border-red-200 bg-red-50">
                <h2 className="text-lg font-semibold text-red-800 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('reminders.overdueTitle')} ({overduePayments.length})
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {overduePayments.map((payment) => (
                  <div key={`overdue-${payment.id}`} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            payment.type === 'receivable'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {payment.type === 'receivable' ? t('debts.receivable') : t('debts.debt')}
                          </span>
                          <span className="font-medium text-gray-900 truncate">{payment.party_name}</span>
                        </div>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <span>{formatDate(payment.due_date)}</span>
                          <span className="mx-2">•</span>
                          <span className="text-red-600 font-medium">{getDaysLabel(payment.days_until_due)}</span>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold text-red-600">
                          {formatCurrency(payment.amount, payment.currency as 'TRY' | 'USD' | 'EUR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <Link to="/debts" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  {t('reminders.viewAllDebts')} →
                </Link>
              </div>
            </div>
          )}

          {/* Upcoming Payments */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('reminders.upcomingTitle')} ({upcomingPayments.length})
              </h2>
            </div>
            {upcomingPayments.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                {t('reminders.noUpcoming')}
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-200">
                  {upcomingPayments.map((payment) => (
                    <div key={`upcoming-${payment.id}`} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              payment.type === 'receivable'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {payment.type === 'receivable' ? t('debts.receivable') : t('debts.debt')}
                            </span>
                            <span className="font-medium text-gray-900 truncate">{payment.party_name}</span>
                          </div>
                          <div className="flex items-center mt-1 text-sm text-gray-500">
                            <span>{formatDate(payment.due_date)}</span>
                            <span className="mx-2">•</span>
                            <span className={`font-medium ${
                              payment.days_until_due <= 3 ? 'text-amber-600' : 'text-gray-600'
                            }`}>
                              {getDaysLabel(payment.days_until_due)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className={`text-lg font-bold ${
                            payment.type === 'receivable' ? 'text-blue-600' : 'text-orange-600'
                          }`}>
                            {formatCurrency(payment.amount, payment.currency as 'TRY' | 'USD' | 'EUR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <Link to="/debts" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                    {t('reminders.viewAllDebts')} →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
