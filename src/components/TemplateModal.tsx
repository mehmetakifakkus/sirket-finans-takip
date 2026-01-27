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

interface Props {
  isOpen: boolean
  onClose: () => void
  onTransactionCreated?: () => void
  presetType?: 'income' | 'expense'
}

type Mode = 'list' | 'create' | 'edit' | 'use'

export function TemplateModal({ isOpen, onClose, onTransactionCreated, presetType }: Props) {
  const { t } = useTranslation()
  const { addAlert } = useAppStore()
  const { user } = useAuthStore()

  const [mode, setMode] = useState<Mode>('list')
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [parties, setParties] = useState<Party[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    type: presetType || ('expense' as 'income' | 'expense'),
    category_id: '',
    party_id: '',
    amount: '',
    currency: 'TRY',
    vat_rate: '20',
    withholding_rate: '0',
    description: '',
    recurrence: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
    next_date: '',
    is_active: true,
  })

  const [useDate, setUseDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
      loadParties()
      loadCategories()
    }
  }, [isOpen])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const result = await api.getTemplates({ is_active: 1 })
      setTemplates(result as Template[])
    } catch {
      addAlert('error', 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const loadParties = async () => {
    try {
      const result = await api.getParties()
      setParties(result as Party[])
    } catch {
      console.error('Failed to load parties')
    }
  }

  const loadCategories = async () => {
    try {
      const result = await api.getCategories()
      setCategories(result as Category[])
    } catch {
      console.error('Failed to load categories')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: presetType || 'expense',
      category_id: '',
      party_id: '',
      amount: '',
      currency: 'TRY',
      vat_rate: '20',
      withholding_rate: '0',
      description: '',
      recurrence: 'none',
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

  const handleUse = (template: Template) => {
    setSelectedTemplate(template)
    setUseDate(new Date().toISOString().split('T')[0])
    setMode('use')
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
      addAlert('error', 'Operation failed')
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
      addAlert('error', 'Delete failed')
    }
  }

  const handleCreateTransaction = async () => {
    if (!selectedTemplate || !user) return

    setLoading(true)
    try {
      const result = await api.createTransactionFromTemplate(
        selectedTemplate.id,
        useDate,
        user.id
      )

      if (result.success) {
        addAlert('success', t('templates.transactionCreated'))
        onTransactionCreated?.()
        onClose()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', 'Transaction creation failed')
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter(c => c.type === formData.type)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'list' && t('templates.title')}
            {mode === 'create' && t('templates.newTemplate')}
            {mode === 'edit' && t('templates.editTemplate')}
            {mode === 'use' && t('templates.useTemplate')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {mode === 'list' && (
            <div className="space-y-4">
              <div className="flex justify-end">
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

              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {t('templates.noTemplates')}
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{template.name}</h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            template.type === 'income'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {template.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                          </span>
                          {template.recurrence !== 'none' && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {t(`templates.recurrenceOptions.${template.recurrence}`)}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {template.party_name && <span>{template.party_name}</span>}
                          {template.party_name && template.category_name && <span> • </span>}
                          {template.category_name && <span>{template.category_name}</span>}
                          {template.amount && (
                            <span className="ml-2 font-medium">
                              {template.amount.toLocaleString('tr-TR')} {template.currency}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUse(template)}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                        >
                          {t('templates.createTransaction')}
                        </button>
                        <button
                          onClick={() => handleEdit(template)}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(template)}
                          className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(mode === 'create' || mode === 'edit') && (
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
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
            </form>
          )}

          {mode === 'use' && selectedTemplate && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">{selectedTemplate.name}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">{t('common.type')}:</span>{' '}
                    {selectedTemplate.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                  </p>
                  {selectedTemplate.party_name && (
                    <p><span className="font-medium">{t('transactions.party')}:</span> {selectedTemplate.party_name}</p>
                  )}
                  {selectedTemplate.category_name && (
                    <p><span className="font-medium">{t('transactions.category')}:</span> {selectedTemplate.category_name}</p>
                  )}
                  {selectedTemplate.amount && (
                    <p>
                      <span className="font-medium">{t('common.amount')}:</span>{' '}
                      {selectedTemplate.amount.toLocaleString('tr-TR')} {selectedTemplate.currency}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.date')} *
                </label>
                <input
                  type="date"
                  value={useDate}
                  onChange={(e) => setUseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          {mode === 'list' && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              {t('common.close')}
            </button>
          )}

          {(mode === 'create' || mode === 'edit') && (
            <>
              <button
                onClick={() => { resetForm(); setMode('list'); }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? t('common.loading') : t('common.save')}
              </button>
            </>
          )}

          {mode === 'use' && (
            <>
              <button
                onClick={() => { setSelectedTemplate(null); setMode('list'); }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreateTransaction}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? t('common.loading') : t('templates.createTransaction')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
