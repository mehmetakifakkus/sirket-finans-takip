import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/currency'
import { formatDate, getToday, getFirstDayOfMonth, getLastDayOfMonth } from '../utils/date'
import type { Transaction, Party, Category, Project } from '../types'

export function Transactions() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [showPartyForm, setShowPartyForm] = useState(false)
  const [newPartyData, setNewPartyData] = useState({
    type: 'customer' as 'customer' | 'vendor' | 'other',
    name: ''
  })
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const { addAlert } = useAppStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [filters, setFilters] = useState({
    type: searchParams.get('type') || '',
    party_id: '',
    category_id: '',
    project_id: '',
    date_from: getFirstDayOfMonth(),
    date_to: getLastDayOfMonth()
  })

  const [formData, setFormData] = useState({
    type: (searchParams.get('type') || 'income') as 'income' | 'expense',
    party_id: '',
    category_id: '',
    project_id: '',
    milestone_id: '',
    date: getToday(),
    amount: '',
    currency: 'TRY' as 'TRY' | 'USD' | 'EUR',
    vat_rate: '0',
    withholding_rate: '0',
    description: '',
    ref_no: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [filters])

  const loadData = async () => {
    try {
      const [partiesRes, categoriesRes, projectsRes] = await Promise.all([
        window.api.getParties(),
        window.api.getCategories(),
        window.api.getProjects()
      ])
      setParties(partiesRes as Party[])
      setCategories(categoriesRes as Category[])
      setProjects(projectsRes as Project[])
    } catch {
      addAlert('error', t('common.dataNotLoaded'))
    }
  }

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const filterParams: Record<string, string | number | undefined> = {}
      if (filters.type) filterParams.type = filters.type
      if (filters.party_id) filterParams.party_id = parseInt(filters.party_id)
      if (filters.category_id) filterParams.category_id = parseInt(filters.category_id)
      if (filters.project_id) filterParams.project_id = parseInt(filters.project_id)
      if (filters.date_from) filterParams.date_from = filters.date_from
      if (filters.date_to) filterParams.date_to = filters.date_to

      const result = await window.api.getTransactions(filterParams)
      setTransactions(result as Transaction[])
    } catch {
      addAlert('error', t('common.dataNotLoaded'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      type: formData.type,
      party_id: formData.party_id ? parseInt(formData.party_id) : null,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      project_id: formData.project_id ? parseInt(formData.project_id) : null,
      milestone_id: formData.milestone_id ? parseInt(formData.milestone_id) : null,
      date: formData.date,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      vat_rate: parseFloat(formData.vat_rate) || 0,
      withholding_rate: parseFloat(formData.withholding_rate) || 0,
      description: formData.description,
      ref_no: formData.ref_no,
      created_by: user?.id
    }

    try {
      if (editingTransaction) {
        const result = await window.api.updateTransaction(editingTransaction.id, data)
        if (result.success) {
          addAlert('success', result.message)
          loadTransactions()
          closeForm()
        } else {
          addAlert('error', result.message)
        }
      } else {
        const result = await window.api.createTransaction(data)
        if (result.success) {
          addAlert('success', result.message)
          loadTransactions()
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
    const confirmed = await window.api.confirm(t('common.confirmDelete'))
    if (!confirmed) return

    try {
      const result = await window.api.deleteTransaction(id)
      if (result.success) {
        addAlert('success', result.message)
        loadTransactions()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.deleteFailed'))
    }
  }

  const handleExport = async () => {
    try {
      const result = await window.api.exportTransactions(filters)
      if (result.success) {
        addAlert('success', t('common.csvCreated') + ': ' + result.path)
      }
    } catch {
      addAlert('error', t('common.exportFailed'))
    }
  }

  const openCreateForm = (type: 'income' | 'expense') => {
    setEditingTransaction(null)
    setFormData({
      type,
      party_id: '',
      category_id: '',
      project_id: '',
      milestone_id: '',
      date: getToday(),
      amount: '',
      currency: 'TRY',
      vat_rate: '0',
      withholding_rate: '0',
      description: '',
      ref_no: ''
    })
    setShowForm(true)
  }

  const openEditForm = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setFormData({
      type: transaction.type,
      party_id: transaction.party_id?.toString() || '',
      category_id: transaction.category_id?.toString() || '',
      project_id: transaction.project_id?.toString() || '',
      milestone_id: transaction.milestone_id?.toString() || '',
      date: transaction.date,
      amount: transaction.amount.toString(),
      currency: transaction.currency as 'TRY' | 'USD' | 'EUR',
      vat_rate: transaction.vat_rate.toString(),
      withholding_rate: transaction.withholding_rate.toString(),
      description: transaction.description || '',
      ref_no: transaction.ref_no || ''
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingTransaction(null)
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      addAlert('error', t('categories.categoryRequired'))
      return
    }

    try {
      const result = await window.api.createCategory({
        name: newCategoryName.trim(),
        type: formData.type,
        parent_id: null,
        is_active: true
      })

      if (result.success) {
        addAlert('success', t('categories.categoryCreated'))
        const categoriesRes = await window.api.getCategories()
        setCategories(categoriesRes as Category[])
        setFormData({ ...formData, category_id: result.id.toString() })
        setShowCategoryForm(false)
        setNewCategoryName('')
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.error'))
    }
  }

  const handleCreateParty = async () => {
    if (!newPartyData.name.trim()) {
      addAlert('error', t('parties.partyRequired'))
      return
    }
    try {
      const result = await window.api.createParty({
        type: newPartyData.type,
        name: newPartyData.name.trim(),
        tax_no: null, phone: null, email: null, address: null, notes: null
      })
      if (result.success) {
        addAlert('success', t('parties.partyCreated'))
        const partiesRes = await window.api.getParties()
        setParties(partiesRes as Party[])
        setFormData({ ...formData, party_id: result.id!.toString() })
        setShowPartyForm(false)
        setNewPartyData({ type: 'customer', name: '' })
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.error'))
    }
  }

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) {
      addAlert('error', t('common.required'))
      return
    }
    if (!formData.party_id) {
      addAlert('error', t('transactions.partySelectFirst'))
      setShowProjectForm(false)
      return
    }
    try {
      const result = await window.api.createProject({
        party_id: parseInt(formData.party_id),
        title: newProjectTitle.trim(),
        contract_amount: 0,
        currency: 'TRY',
        start_date: null,
        end_date: null,
        status: 'active',
        notes: t('transactions.quickCreatedNote')
      })
      if (result.success) {
        addAlert('success', t('transactions.projectCreatedMissingInfo'))
        const projectsRes = await window.api.getProjects()
        setProjects(projectsRes as Project[])
        setFormData({ ...formData, project_id: result.id!.toString() })
        setShowProjectForm(false)
        setNewProjectTitle('')
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.error'))
    }
  }

  const filteredCategories = categories.filter(c => c.type === formData.type && c.is_active)

  // Calculate totals
  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'income') {
      acc.income += t.amount_try || 0
    } else {
      acc.expense += t.amount_try || 0
    }
    return acc
  }, { income: 0, expense: 0 })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('transactions.title')}</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            CSV
          </button>
          <button
            onClick={() => openCreateForm('income')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('transactions.income')}
          </button>
          <button
            onClick={() => openCreateForm('expense')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
            {t('transactions.expense')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('common.type')}</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">{t('common.all')}</option>
              <option value="income">{t('transactions.income')}</option>
              <option value="expense">{t('transactions.expense')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('transactions.party')}</label>
            <select
              value={filters.party_id}
              onChange={(e) => setFilters({ ...filters, party_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">{t('common.all')}</option>
              {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('transactions.category')}</label>
            <select
              value={filters.category_id}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">{t('common.all')}</option>
              {categories.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('transactions.project')}</label>
            <select
              value={filters.project_id}
              onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">{t('common.all')}</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('transactions.startDate')}</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('transactions.endDate')}</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-600">{t('transactions.totalIncome')}</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(totals.income, 'TRY')}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <p className="text-sm text-red-600">{t('transactions.totalExpense')}</p>
          <p className="text-xl font-bold text-red-700">{formatCurrency(totals.expense, 'TRY')}</p>
        </div>
        <div className={`rounded-lg p-4 border ${totals.income - totals.expense >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className={`text-sm ${totals.income - totals.expense >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{t('transactions.balance')}</p>
          <p className={`text-xl font-bold ${totals.income - totals.expense >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {formatCurrency(totals.income - totals.expense, 'TRY')}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.category')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.party')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.amount')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('transactions.netAmount')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    {t('transactions.noTransactions')}
                  </td>
                </tr>
              ) : (
                transactions.map((tr) => (
                  <tr key={tr.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(tr.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        tr.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tr.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tr.category_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{tr.party_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(tr.amount, tr.currency as 'TRY' | 'USD' | 'EUR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(tr.net_amount, tr.currency as 'TRY' | 'USD' | 'EUR')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {isAdmin && (
                        <>
                          <button onClick={() => openEditForm(tr)} className="text-blue-600 hover:text-blue-800 mr-3">{t('common.edit')}</button>
                          <button onClick={() => handleDelete(tr.id)} className="text-red-600 hover:text-red-800">{t('common.delete')}</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTransaction ? t('transactions.editTransaction') : (formData.type === 'income' ? t('transactions.newIncome') : t('transactions.newExpense'))}
              </h3>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')} *</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.currency')}</label>
                  <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'TRY' | 'USD' | 'EUR' })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.amount')} *</label>
                <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.vatRate')}</label>
                  <input type="number" step="0.01" value={formData.vat_rate} onChange={(e) => setFormData({ ...formData, vat_rate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                {formData.type === 'income' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.withholdingRate')}</label>
                    <input type="number" step="0.01" value={formData.withholding_rate} onChange={(e) => setFormData({ ...formData, withholding_rate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.category')}</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => {
                    if (e.target.value === 'new') {
                      setShowCategoryForm(true)
                    } else {
                      setFormData({ ...formData, category_id: e.target.value })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('common.select')}</option>
                  {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value="new">+ {t('transactions.addNewCategory')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.party')}</label>
                <select
                  value={formData.party_id}
                  onChange={(e) => {
                    if (e.target.value === 'new') {
                      setShowPartyForm(true)
                    } else {
                      setFormData({ ...formData, party_id: e.target.value })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('common.select')}</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  <option value="new">+ {t('transactions.addNewParty')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.project')}</label>
                <select
                  value={formData.project_id}
                  onChange={(e) => {
                    if (e.target.value === 'new') {
                      if (!formData.party_id) {
                        addAlert('error', t('transactions.partySelectFirst'))
                      } else {
                        setShowProjectForm(true)
                      }
                    } else {
                      setFormData({ ...formData, project_id: e.target.value })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('common.select')}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  <option value="new">+ {t('transactions.addNewProject')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.description')}</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('transactions.refNo')}</label>
                <input type="text" value={formData.ref_no} onChange={(e) => setFormData({ ...formData, ref_no: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">{editingTransaction ? t('common.update') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Form Mini Modal */}
      {showCategoryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{t('categories.newCategory')}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCategoryForm(false)
                  setNewCategoryName('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('categories.categoryName')} *</label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateCategory()
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <p className="text-sm text-gray-500">
                {t('transactions.typeAuto', { type: formData.type === 'income' ? t('transactions.income') : t('transactions.expense') })}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCategoryForm(false)
                    setNewCategoryName('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Party Form Mini Modal */}
      {showPartyForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{t('parties.newParty')}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowPartyForm(false)
                  setNewPartyData({ type: 'customer', name: '' })
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('parties.partyType')} *</label>
                <select
                  value={newPartyData.type}
                  onChange={(e) => setNewPartyData({ ...newPartyData, type: e.target.value as 'customer' | 'vendor' | 'other' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="customer">{t('parties.customer')}</option>
                  <option value="vendor">{t('parties.vendor')}</option>
                  <option value="other">{t('parties.other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('parties.partyName')} *</label>
                <input
                  type="text"
                  value={newPartyData.name}
                  onChange={(e) => setNewPartyData({ ...newPartyData, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateParty()
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <p className="text-sm text-gray-500">
                {t('transactions.otherInfoFromParties')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPartyForm(false)
                    setNewPartyData({ type: 'customer', name: '' })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleCreateParty}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Form Mini Modal */}
      {showProjectForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{t('projects.newProject')}</h3>
              <button
                type="button"
                onClick={() => {
                  setShowProjectForm(false)
                  setNewProjectTitle('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.projectName')} *</label>
                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleCreateProject()
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              <p className="text-sm text-gray-500">
                {t('transactions.party')}: {parties.find(p => p.id.toString() === formData.party_id)?.name || '-'}
              </p>
              <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
                {t('transactions.otherInfoFromProjects')}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectForm(false)
                    setNewProjectTitle('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
