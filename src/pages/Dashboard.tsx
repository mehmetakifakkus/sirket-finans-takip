import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatCurrency } from '../utils/currency'
import { formatDate, isOverdue } from '../utils/date'
import type { DashboardData, Transaction, Installment, Project } from '../types'

export function Dashboard() {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const result = await window.api.getDashboardData()
      setData(result as DashboardData)
    } catch (error) {
      console.error('Dashboard data fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        {t('common.dataNotLoaded')}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Monthly Income */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('dashboard.monthlyIncome')}</p>
              <p className="text-xl font-semibold text-green-600">{formatCurrency(data.monthly_income, 'TRY')}</p>
            </div>
          </div>
        </div>

        {/* Monthly Expense */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('dashboard.monthlyExpense')}</p>
              <p className="text-xl font-semibold text-red-600">{formatCurrency(data.monthly_expense, 'TRY')}</p>
            </div>
          </div>
        </div>

        {/* Total Receivable */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('dashboard.totalReceivable')}</p>
              <p className="text-xl font-semibold text-blue-600">{formatCurrency(data.total_receivable, 'TRY')}</p>
            </div>
          </div>
        </div>

        {/* Total Debt */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{t('dashboard.totalDebt')}</p>
              <p className="text-xl font-semibold text-orange-600">{formatCurrency(data.total_debt, 'TRY')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Balance and Position Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Balance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.monthlyBalance')}</h3>
          <div className={`text-3xl font-bold ${data.monthly_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.monthly_balance, 'TRY')}
          </div>
          <p className="text-sm text-gray-500 mt-2">{t('dashboard.incomeMinusExpense')}</p>
        </div>

        {/* Net Position */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.netPosition')}</h3>
          <div className={`text-3xl font-bold ${data.net_position >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(data.net_position, 'TRY')}
          </div>
          <p className="text-sm text-gray-500 mt-2">{t('dashboard.receivableMinusDebt')}</p>
        </div>
      </div>

      {/* Overdue and Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Installments */}
        {data.overdue_count > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-red-200">
            <div className="px-6 py-4 border-b border-red-200 bg-red-50">
              <h3 className="text-lg font-semibold text-red-800 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {t('dashboard.overdueInstallments')} ({data.overdue_count})
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {data.overdue_installments.slice(0, 5).map((installment: Installment) => (
                  <div key={installment.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{installment.party_name}</p>
                      <p className="text-sm text-red-600">{t('dashboard.dueDate')}: {formatDate(installment.due_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(installment.amount - installment.paid_amount, installment.currency as 'TRY' | 'USD' | 'EUR')}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${installment.kind === 'debt' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                        {installment.kind === 'debt' ? t('debts.debt') : t('debts.receivable')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Link to="/debts" className="mt-4 block text-center text-sm text-red-600 hover:text-red-700">
                {t('dashboard.viewAllOverdue')} &rarr;
              </Link>
            </div>
          </div>
        )}

        {/* Upcoming Installments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.upcomingInstallments')}</h3>
          </div>
          <div className="p-6">
            {data.upcoming_installments.length > 0 ? (
              <div className="space-y-3">
                {data.upcoming_installments.slice(0, 5).map((installment: Installment) => (
                  <div key={installment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{installment.party_name}</p>
                      <p className={`text-sm ${isOverdue(installment.due_date) ? 'text-red-600' : 'text-gray-500'}`}>
                        {t('dashboard.dueDate')}: {formatDate(installment.due_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(installment.amount - installment.paid_amount, installment.currency as 'TRY' | 'USD' | 'EUR')}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${installment.kind === 'debt' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
                        {installment.kind === 'debt' ? t('debts.debt') : t('debts.receivable')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">{t('dashboard.noUpcomingInstallments')}</p>
            )}
            <Link to="/debts" className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-700">
              {t('dashboard.viewAllInstallments')} &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Transactions and Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.recentTransactions')}</h3>
          </div>
          <div className="p-6">
            {data.recent_transactions.length > 0 ? (
              <div className="space-y-3">
                {data.recent_transactions.map((transaction: Transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{transaction.description || transaction.category_name || '-'}</p>
                      <p className="text-sm text-gray-500">{formatDate(transaction.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.net_amount, transaction.currency as 'TRY' | 'USD' | 'EUR')}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${transaction.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {transaction.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">{t('dashboard.noTransactions')}</p>
            )}
            <Link to="/transactions" className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-700">
              {t('dashboard.viewAllTransactions')} &rarr;
            </Link>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.activeProjects')} ({data.active_projects_count})</h3>
          </div>
          <div className="p-6">
            {data.active_projects.length > 0 ? (
              <div className="space-y-3">
                {data.active_projects.slice(0, 5).map((project: Project) => (
                  <div key={project.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">{project.title}</p>
                      <p className="text-sm text-gray-500">{project.party_name || t('projects.internalProject')}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-2 bg-blue-600 rounded-full"
                            style={{ width: `${Math.min(project.percentage || 0, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{project.percentage?.toFixed(0) || 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">{t('dashboard.noActiveProjects')}</p>
            )}
            <Link to="/projects" className="mt-4 block text-center text-sm text-blue-600 hover:text-blue-700">
              {t('dashboard.viewAllProjects')} &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
