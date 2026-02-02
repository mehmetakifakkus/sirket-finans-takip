import { useEffect, useState, useMemo } from 'react'
import { api } from '@/api'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/currency'
import { formatDate, getToday, isOverdue } from '../utils/date'
import { FilterBar, SelectFilter, ActiveFiltersDisplay } from '../components/filters'
import { SearchableSelect } from '../components/SearchableSelect'
import { DateRangePicker } from '../components/DateRangePicker'
import { PaymentRemindersContent } from './PaymentReminders'
import type { Debt, Party } from '../types'

type TabType = 'debts' | 'reminders'

export function Debts() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'debts')
  const [debts, setDebts] = useState<Debt[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const { addAlert } = useAppStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setSearchParams(tab === 'debts' ? {} : { tab })
  }

  const [filters, setFilters] = useState({
    kind: '',
    party_id: '',
    status: 'open',
    date_from: '',
    date_to: ''
  })

  const [formData, setFormData] = useState({
    kind: 'debt' as 'debt' | 'receivable',
    party_id: '',
    principal_amount: '',
    currency: 'TRY' as 'TRY' | 'USD' | 'EUR' | 'GR',
    vat_rate: '0',
    start_date: getToday(),
    due_date: '',
    notes: ''
  })

  useEffect(() => {
    loadParties()
  }, [])

  useEffect(() => {
    loadDebts()
  }, [filters])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showForm) {
        closeForm()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showForm])

  const loadParties = async () => {
    try {
      const result = await api.getParties()
      setParties(result as Party[])
    } catch {
      addAlert('error', t('debts.errors.partiesLoadFailed'))
    }
  }

  const loadDebts = async () => {
    setLoading(true)
    try {
      const filterParams: Record<string, string | number | undefined> = {}
      if (filters.kind) filterParams.kind = filters.kind
      if (filters.party_id) filterParams.party_id = parseInt(filters.party_id)
      if (filters.status) filterParams.status = filters.status
      if (filters.date_from) filterParams.date_from = filters.date_from
      if (filters.date_to) filterParams.date_to = filters.date_to

      const result = await api.getDebts(filterParams)
      setDebts(result as Debt[])
    } catch {
      addAlert('error', t('common.dataLoadError'))
    } finally {
      setLoading(false)
    }
  }

  // Build active filters list for display
  const activeFiltersList = useMemo(() => {
    const list: { key: string; label: string; value: string; onRemove: () => void }[] = []

    if (filters.kind) {
      list.push({
        key: 'kind',
        label: t('debts.filters.type'),
        value: filters.kind === 'receivable' ? t('debts.receivable') : t('debts.debt'),
        onRemove: () => setFilters(prev => ({ ...prev, kind: '' }))
      })
    }

    if (filters.party_id) {
      const party = parties.find(p => p.id.toString() === filters.party_id)
      if (party) {
        list.push({
          key: 'party_id',
          label: t('debts.filters.party'),
          value: party.name,
          onRemove: () => setFilters(prev => ({ ...prev, party_id: '' }))
        })
      }
    }

    if (filters.status) {
      list.push({
        key: 'status',
        label: t('debts.filters.status'),
        value: filters.status === 'open' ? t('debts.status.open') : t('debts.status.closed'),
        onRemove: () => setFilters(prev => ({ ...prev, status: '' }))
      })
    }

    if (filters.date_from || filters.date_to) {
      let dateValue = ''
      if (filters.date_from && filters.date_to) {
        dateValue = `${formatDate(filters.date_from)} - ${formatDate(filters.date_to)}`
      } else if (filters.date_from) {
        dateValue = `${t('dateRange.from')}: ${formatDate(filters.date_from)}`
      } else if (filters.date_to) {
        dateValue = `${t('dateRange.to')}: ${formatDate(filters.date_to)}`
      }
      list.push({
        key: 'date',
        label: t('dateRange.label'),
        value: dateValue,
        onRemove: () => setFilters(prev => ({ ...prev, date_from: '', date_to: '' }))
      })
    }

    return list
  }, [filters, parties, t])

  const resetFilters = () => {
    setFilters({ kind: '', party_id: '', status: '', date_from: '', date_to: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      kind: formData.kind,
      party_id: parseInt(formData.party_id),
      principal_amount: parseFloat(formData.principal_amount),
      currency: formData.currency,
      vat_rate: parseFloat(formData.vat_rate) || 0,
      start_date: formData.start_date || null,
      due_date: formData.due_date || null,
      notes: formData.notes
    }

    try {
      if (editingDebt) {
        const result = await api.updateDebt(editingDebt.id, data)
        if (result.success) {
          addAlert('success', result.message)
          loadDebts()
          closeForm()
        } else {
          addAlert('error', result.message)
        }
      } else {
        const result = await api.createDebt(data)
        if (result.success) {
          addAlert('success', result.message)
          loadDebts()
          closeForm()
        } else {
          addAlert('error', result.message)
        }
      }
    } catch {
      addAlert('error', t('common.error'))
    }
  }

  const handleDelete = async (id: number) => {
    const confirmed = await api.confirm(t('common.deleteConfirm'))
    if (!confirmed) return

    try {
      const result = await api.deleteDebt(id)
      if (result.success) {
        addAlert('success', result.message)
        loadDebts()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.deleteFailed'))
    }
  }

  const handleExport = async () => {
    try {
      const result = await api.exportDebts(filters)
      if (result.success) {
        addAlert('success', t('common.csvCreated'))
      }
    } catch {
      addAlert('error', t('common.exportFailed'))
    }
  }

  const openCreateForm = (kind: 'debt' | 'receivable') => {
    setEditingDebt(null)
    setFormData({
      kind,
      party_id: '',
      principal_amount: '',
      currency: 'TRY',
      vat_rate: '0',
      start_date: getToday(),
      due_date: '',
      notes: ''
    })
    setShowForm(true)
  }

  const openEditForm = (debt: Debt) => {
    setEditingDebt(debt)
    setFormData({
      kind: debt.kind,
      party_id: debt.party_id.toString(),
      principal_amount: debt.principal_amount.toString(),
      currency: debt.currency as 'TRY' | 'USD' | 'EUR',
      vat_rate: debt.vat_rate.toString(),
      start_date: debt.start_date || '',
      due_date: debt.due_date || '',
      notes: debt.notes || ''
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingDebt(null)
  }

  // Calculate totals
  const totals = debts.reduce((acc, d) => {
    if (d.kind === 'debt') {
      acc.debt += d.remaining_amount || 0
    } else {
      acc.receivable += d.remaining_amount || 0
    }
    return acc
  }, { debt: 0, receivable: 0 })

  return (
    <div className="flex flex-col h-full">
      {/* Header Section - Fixed */}
      <div className="flex-shrink-0 space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('debts.title')}</h1>
        {activeTab === 'debts' && (
          <div className="flex space-x-3">
            <button onClick={handleExport} className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              CSV
            </button>
            <button onClick={() => openCreateForm('receivable')} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('debts.receivable')}
            </button>
            <button onClick={() => openCreateForm('debt')} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('debts.debt')}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => handleTabChange('debts')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'debts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('debts.tabs.list')}
          </button>
          <button
            onClick={() => handleTabChange('reminders')}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reminders'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('debts.tabs.reminders')}
          </button>
        </nav>
      </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'reminders' ? (
        <div className="flex-1 min-h-0 overflow-auto">
          <PaymentRemindersContent />
        </div>
      ) : (
      <>
      {/* Header for Debts Tab - Fixed */}
      <div className="flex-shrink-0 space-y-6 pb-4">
      {/* Filters */}
      <FilterBar columns={4}>
        <SelectFilter
          label={t('debts.filters.type')}
          value={filters.kind}
          onChange={(value) => setFilters({ ...filters, kind: value })}
          options={[
            { value: 'debt', label: t('debts.debt') },
            { value: 'receivable', label: t('debts.receivable') }
          ]}
        />
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('debts.filters.party')}</label>
          <SearchableSelect
            options={parties.map(p => ({ value: p.id.toString(), label: p.name }))}
            value={filters.party_id}
            onChange={(value) => setFilters({ ...filters, party_id: value })}
            placeholder={t('common.search')}
          />
        </div>
        <SelectFilter
          label={t('debts.filters.status')}
          value={filters.status}
          onChange={(value) => setFilters({ ...filters, status: value })}
          options={[
            { value: 'open', label: t('debts.status.open') },
            { value: 'closed', label: t('debts.status.closed') }
          ]}
        />
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('dateRange.label')}</label>
          <DateRangePicker
            dateFrom={filters.date_from}
            dateTo={filters.date_to}
            onChange={(from, to) => setFilters({ ...filters, date_from: from, date_to: to })}
          />
        </div>
      </FilterBar>

      {/* Active Filters Banner */}
      <ActiveFiltersDisplay
        filters={activeFiltersList}
        onClearAll={resetFilters}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-600">{t('debts.totalReceivable')}</p>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(totals.receivable, 'TRY')}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <p className="text-sm text-orange-600">{t('debts.totalDebt')}</p>
          <p className="text-xl font-bold text-orange-700">{formatCurrency(totals.debt, 'TRY')}</p>
        </div>
      </div>
      </div>

      {/* Table - Scrollable */}
      <div className="flex-1 min-h-0 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('debts.table.type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('debts.table.party')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('debts.table.principal')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('debts.table.remaining')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('debts.table.dueDate')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('debts.table.status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {debts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">{t('common.noRecords')}</td>
                </tr>
              ) : (
                debts.map((debt) => (
                  <tr key={debt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${debt.kind === 'receivable' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                        {debt.kind === 'receivable' ? t('debts.receivable') : t('debts.debt')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/debts/${debt.id}`} className="font-medium text-blue-600 hover:text-blue-800">{debt.party_name}</Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(debt.principal_amount, debt.currency as 'TRY' | 'USD' | 'EUR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(debt.remaining_amount || 0, debt.currency as 'TRY' | 'USD' | 'EUR')}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isOverdue(debt.due_date) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{formatDate(debt.due_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${debt.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                        {debt.status === 'open' ? t('debts.status.open') : t('debts.status.closed')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link to={`/debts/${debt.id}`} className="text-blue-600 hover:text-blue-800 mr-3">{t('common.detail')}</Link>
                      {isAdmin && (
                        <>
                          <button onClick={() => openEditForm(debt)} className="text-blue-600 hover:text-blue-800 mr-3">{t('common.edit')}</button>
                          <button onClick={() => handleDelete(debt.id)} className="text-red-600 hover:text-red-800">{t('common.delete')}</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{editingDebt ? t('debts.form.editTitle') : t('debts.form.newTitle', { type: formData.kind === 'receivable' ? t('debts.receivable') : t('debts.debt') })}</h3>
              <button
                type="button"
                onClick={closeForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('debts.form.party')} *</label>
                <select value={formData.party_id} onChange={(e) => setFormData({ ...formData, party_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                  <option value="">{t('common.select')}</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('debts.form.principal')} *</label>
                  <input type="number" step="0.01" value={formData.principal_amount} onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('debts.form.currency')}</label>
                  <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'TRY' | 'USD' | 'EUR' | 'GR' })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GR">Altın (gr)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('debts.form.startDate')}</label>
                  <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('debts.form.dueDate')}</label>
                  <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('debts.form.notes')}</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={2} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">{editingDebt ? t('common.update') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
