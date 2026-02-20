import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import type { Party, Category } from '../types'

interface Template {
  id: number
  name: string
  type: 'income' | 'expense'
  category_id: number | null
  party_id: number | null
  amount: number | null
  currency: string
  vat_rate: number
  withholding_rate: number
  description: string | null
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  next_date: string | null
  is_active: number
  category_name?: string
  party_name?: string
}

type FilterStatus = 'all' | 'active' | 'inactive'
type Mode = 'list' | 'create' | 'edit'

export function RecurringTransactions() {
  const { t } = useTranslation()
  const { addAlert } = useAppStore()
  const { user } = useAuthStore()

  const [templates, setTemplates] = useState<Template[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active')
  const [mode, setMode] = useState<Mode>('list')
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [processing, setProcessing] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    category_id: '',
    party_id: '',
    amount: '',
    currency: 'TRY',
    vat_rate: '20',
    withholding_rate: '0',
    description: '',
    recurrence: 'monthly' as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
    next_date: '',
    is_active: true,
  })

  useEffect(() => {
    loadTemplates()
    loadParties()
    loadCategories()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const result = await api.getTemplates()
      setTemplates(result as Template[])
    } catch {
      addAlert('error', t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const loadParties = async () => {
    try {
      const result = await api.getParties()
      setParties(result as Party[])
    } catch {
      // ignore
    }
  }

  const loadCategories = async () => {
    try {
      const result = await api.getCategories()
      setCategories(result as Category[])
    } catch {
      // ignore
    }
  }

  const filteredTemplates = templates.filter(t => {
    if (filterStatus === 'active') return t.is_active === 1
    if (filterStatus === 'inactive') return t.is_active === 0
    return true
  })

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'expense',
      category_id: '',
      party_id: '',
      amount: '',
      currency: 'TRY',
      vat_rate: '20',
      withholding_rate: '0',
      description: '',
      recurrence: 'monthly',
      next_date: '',
      is_active: true,
    })
    setSelectedTemplate(null)
  }

  const handleCreate = () => {
    resetForm()
    setMode('create')
  }

  const handleEdit = (template: Template) => {
    setSelectedTemplate(template)
    setFormData({
      name: template.name,
      type: template.type,
      category_id: template.category_id?.toString() || '',
      party_id: template.party_id?.toString() || '',
      amount: template.amount?.toString() || '',
      currency: template.currency,
      vat_rate: template.vat_rate.toString(),
      withholding_rate: template.withholding_rate.toString(),
      description: template.description || '',
      recurrence: template.recurrence,
      next_date: template.next_date || '',
      is_active: template.is_active === 1,
    })
    setMode('edit')
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      addAlert('error', t('validation.required'))
      return
    }

    setLoading(true)
    try {
      const data = {
        name: formData.name,
        type: formData.type,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        party_id: formData.party_id ? parseInt(formData.party_id) : null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        currency: formData.currency,
        vat_rate: parseFloat(formData.vat_rate) || 0,
        withholding_rate: parseFloat(formData.withholding_rate) || 0,
        description: formData.description || null,
        recurrence: formData.recurrence,
        next_date: formData.next_date || null,
        is_active: formData.is_active ? 1 : 0,
        created_by: user?.id,
      }

      if (mode === 'edit' && selectedTemplate) {
        const result = await api.updateTemplate(selectedTemplate.id, data)
        if (result.success) {
          addAlert('success', t('templates.templateUpdated'))
          await loadTemplates()
          setMode('list')
        } else {
          addAlert('error', result.message)
        }
      } else {
        const result = await api.createTemplate(data)
        if (result.success) {
          addAlert('success', t('templates.templateCreated'))
          await loadTemplates()
          setMode('list')
        } else {
          addAlert('error', result.message)
        }
      }
    } catch {
      addAlert('error', t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (template: Template) => {
    if (!window.confirm(t('templates.confirmDelete'))) return

    try {
      const result = await api.deleteTemplate(template.id)
      if (result.success) {
        addAlert('success', t('templates.templateDeleted'))
        await loadTemplates()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.error'))
    }
  }

  const handleToggleActive = async (template: Template) => {
    try {
      const result = await api.updateTemplate(template.id, {
        is_active: template.is_active === 1 ? 0 : 1,
      })
      if (result.success) {
        await loadTemplates()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.error'))
    }
  }

  const handleRunNow = async (template: Template) => {
    if (!user) return
    try {
      const today = new Date().toISOString().split('T')[0]
      const result = await api.createTransactionFromTemplate(template.id, today, user.id)
      if (result.success) {
        addAlert('success', t('templates.transactionCreated'))
        await loadTemplates()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.error'))
    }
  }

  const handleProcessAll = async () => {
    if (!user) return
    setProcessing(true)
    try {
      const result = await api.processOverdueTemplates(user.id)
      if (result.transactionsCreated > 0) {
        addAlert('success', t('templates.autoProcessed', { count: result.transactionsCreated }))
        await loadTemplates()
      } else {
        addAlert('info', t('templates.noActiveRecurring'))
      }
    } catch {
      addAlert('error', t('common.error'))
    } finally {
      setProcessing(false)
    }
  }

  const filteredCategories = categories.filter(c => c.type === formData.type)

  if (mode !== 'list') {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'create' ? t('templates.newTemplate') : t('templates.editTemplate')}
          </h1>
          <button
            onClick={() => { resetForm(); setMode('list') }}
            className="text-gray-600 hover:text-gray-900"
          >
            {t('common.cancel')}
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleSave() }} className="bg-white rounded-lg shadow p-6 space-y-4">
          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('templates.templateName')} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('templates.templateNamePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.type')} *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense', category_id: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="income">{t('transactions.income')}</option>
              <option value="expense">{t('transactions.expense')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Party */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('transactions.party')}
              </label>
              <select
                value={formData.party_id}
                onChange={(e) => setFormData({ ...formData, party_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('common.select')}</option>
                {parties.map(party => (
                  <option key={party.id} value={party.id}>{party.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('transactions.category')}
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{t('common.select')}</option>
                {filteredCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.amount')}
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                step="0.01"
                min="0"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.currency')}
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="TRY">TRY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GR">Altın (gr)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* VAT Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('transactions.vatRate')} (%)
              </label>
              <input
                type="number"
                value={formData.vat_rate}
                onChange={(e) => setFormData({ ...formData, vat_rate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                step="0.01"
                min="0"
                max="100"
              />
            </div>

            {/* Withholding Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('transactions.withholdingRate')} (%)
              </label>
              <input
                type="number"
                value={formData.withholding_rate}
                onChange={(e) => setFormData({ ...formData, withholding_rate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                step="0.01"
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Recurrence */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('templates.recurrence')}
              </label>
              <select
                value={formData.recurrence}
                onChange={(e) => setFormData({ ...formData, recurrence: e.target.value as typeof formData.recurrence })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="none">{t('templates.recurrenceOptions.none')}</option>
                <option value="daily">{t('templates.recurrenceOptions.daily')}</option>
                <option value="weekly">{t('templates.recurrenceOptions.weekly')}</option>
                <option value="monthly">{t('templates.recurrenceOptions.monthly')}</option>
                <option value="yearly">{t('templates.recurrenceOptions.yearly')}</option>
              </select>
            </div>

            {formData.recurrence !== 'none' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('templates.nextDate')}
                </label>
                <input
                  type="date"
                  value={formData.next_date}
                  onChange={(e) => setFormData({ ...formData, next_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Active */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              {t('templates.active')}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => { resetForm(); setMode('list') }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('templates.recurringTitle')}</h1>
        <div className="flex gap-2">
          <button
            onClick={handleProcessAll}
            disabled={processing}
            className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {processing ? t('common.loading') : t('templates.processAll')}
          </button>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('templates.newTemplate')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['active', 'inactive', 'all'] as FilterStatus[]).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 text-sm rounded-md ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'active' ? t('templates.active') : status === 'inactive' ? t('templates.inactive') : t('common.all')}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow">
          {t('templates.noActiveRecurring')}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('templates.templateName')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.type')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.party')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.category')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.amount')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('templates.recurrence')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('templates.nextDate')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('templates.active')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTemplates.map(template => (
                  <tr key={template.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{template.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        template.type === 'income'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {template.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{template.party_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{template.category_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {template.amount ? `${template.amount.toLocaleString('tr-TR')} ${template.currency}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {template.recurrence !== 'none' ? (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                          {t(`templates.recurrenceOptions.${template.recurrence}`)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{template.next_date || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(template)}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          template.is_active === 1 ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            template.is_active === 1 ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleRunNow(template)}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          title={t('templates.manualProcess')}
                        >
                          {t('templates.manualProcess')}
                        </button>
                        <button
                          onClick={() => handleEdit(template)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
