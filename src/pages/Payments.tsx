import { useEffect, useState, useMemo } from 'react'
import { api } from '@/api'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/currency'
import { formatDate } from '../utils/date'
import { FilterBar, SelectFilter, ActiveFiltersDisplay } from '../components/filters'
import { DateRangePicker } from '../components/DateRangePicker'
import type { Payment } from '../types'

export function Payments() {
  const { t } = useTranslation()

  const methodLabels = {
    cash: t('payments.methods.cash'),
    bank: t('payments.methods.bank'),
    card: t('payments.methods.card'),
    other: t('payments.methods.other')
  }
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const { addAlert } = useAppStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    method: ''
  })

  useEffect(() => {
    loadPayments()
  }, [filters])

  const loadPayments = async () => {
    setLoading(true)
    try {
      const filterParams: Record<string, string | undefined> = {}
      if (filters.start_date) filterParams.start_date = filters.start_date
      if (filters.end_date) filterParams.end_date = filters.end_date
      if (filters.method) filterParams.method = filters.method

      const result = await api.getPayments(filterParams)
      setPayments(result as Payment[])
    } catch {
      addAlert('error', t('payments.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    const confirmed = await api.confirm(t('payments.confirmDelete'))
    if (!confirmed) return

    try {
      const result = await api.deletePayment(id)
      if (result.success) {
        addAlert('success', result.message)
        loadPayments()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.deleteFailed'))
    }
  }

  const clearFilters = () => {
    setFilters({ start_date: '', end_date: '', method: '' })
  }

  // Build active filters list for display
  const activeFiltersList = useMemo(() => {
    const list: { key: string; label: string; value: string; onRemove: () => void }[] = []

    if (filters.start_date || filters.end_date) {
      let dateValue = ''
      if (filters.start_date && filters.end_date) {
        dateValue = `${formatDate(filters.start_date)} - ${formatDate(filters.end_date)}`
      } else if (filters.start_date) {
        dateValue = `${t('dateRange.from')}: ${formatDate(filters.start_date)}`
      } else if (filters.end_date) {
        dateValue = `${t('dateRange.to')}: ${formatDate(filters.end_date)}`
      }
      list.push({
        key: 'date',
        label: t('dateRange.label'),
        value: dateValue,
        onRemove: () => setFilters(prev => ({ ...prev, start_date: '', end_date: '' }))
      })
    }

    if (filters.method) {
      list.push({
        key: 'method',
        label: t('payments.filters.method'),
        value: methodLabels[filters.method as keyof typeof methodLabels],
        onRemove: () => setFilters(prev => ({ ...prev, method: '' }))
      })
    }

    return list
  }, [filters, t, methodLabels])

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('payments.title')}</h1>
      </div>

      {/* Filters */}
      <FilterBar columns={2}>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('dateRange.label')}</label>
          <DateRangePicker
            dateFrom={filters.start_date}
            dateTo={filters.end_date}
            onChange={(from, to) => setFilters({ ...filters, start_date: from, end_date: to })}
          />
        </div>
        <SelectFilter
          label={t('payments.filters.method')}
          value={filters.method}
          onChange={(value) => setFilters({ ...filters, method: value })}
          options={[
            { value: 'cash', label: t('payments.methods.cash') },
            { value: 'bank', label: t('payments.methods.bank') },
            { value: 'card', label: t('payments.methods.card') },
            { value: 'other', label: t('payments.methods.other') }
          ]}
        />
      </FilterBar>

      {/* Active Filters Banner */}
      <ActiveFiltersDisplay
        filters={activeFiltersList}
        onClearAll={clearFilters}
      />

      {/* Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{t('payments.totalPayment')}</p>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalAmount, 'TRY')}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{t('payments.recordCount')}</p>
            <p className="text-3xl font-bold text-gray-900">{payments.length}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('payments.table.date')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('payments.table.related')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('payments.table.amount')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('payments.table.method')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('payments.table.notes')}</th>
              {isAdmin && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-gray-500">
                  {t('payments.noPayments')}
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(payment.payment_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{payment.party_name || '-'}</div>
                    {payment.installment_id && (
                      <div className="text-xs text-gray-500">{t('payments.installment')} #{payment.installment_id}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                    {formatCurrency(payment.amount, payment.currency as 'TRY' | 'USD' | 'EUR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      payment.method === 'cash' ? 'bg-green-100 text-green-800' :
                      payment.method === 'bank' ? 'bg-blue-100 text-blue-800' :
                      payment.method === 'card' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {methodLabels[payment.method]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {payment.notes || '-'}
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
