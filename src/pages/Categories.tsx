import { useEffect, useState } from 'react'
import { api } from '@/api'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import type { Category } from '../types'

export function Categories() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [filterType, _setFilterType] = useState<string>('')
  const { addAlert } = useAppStore()

  // Merge state
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergeSource, setMergeSource] = useState<Category | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'income' as 'income' | 'expense',
    parent_id: null as number | null,
    is_active: true
  })

  useEffect(() => {
    loadCategories()
  }, [filterType])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showForm) closeForm()
        if (showMergeModal) closeMergeModal()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showForm, showMergeModal])

  const loadCategories = async () => {
    try {
      const result = await api.getCategories(filterType || undefined)
      setCategories(result as Category[])
    } catch {
      addAlert('error', t('categories.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingCategory) {
        const result = await api.updateCategory(editingCategory.id, formData)
        if (result.success) {
          addAlert('success', result.message)
          loadCategories()
          closeForm()
        } else {
          addAlert('error', result.message)
        }
      } else {
        const result = await api.createCategory(formData)
        if (result.success) {
          addAlert('success', result.message)
          loadCategories()
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
    const confirmed = await api.confirm(t('categories.confirmDelete'))
    if (!confirmed) return

    try {
      const result = await api.deleteCategory(id)
      if (result.success) {
        addAlert('success', result.message)
        loadCategories()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.deleteFailed'))
    }
  }

  const openCreateForm = () => {
    setEditingCategory(null)
    setFormData({ name: '', type: 'income', parent_id: null, is_active: true })
    setShowForm(true)
  }

  const openEditForm = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      type: category.type,
      parent_id: category.parent_id,
      is_active: !!category.is_active
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingCategory(null)
  }

  // Merge handlers
  const openMergeModal = (category: Category) => {
    setMergeSource(category)
    setMergeTargetId(null)
    setShowMergeModal(true)
  }

  const closeMergeModal = () => {
    setShowMergeModal(false)
    setMergeSource(null)
    setMergeTargetId(null)
  }

  const handleMerge = async () => {
    if (!mergeSource || !mergeTargetId) return

    try {
      const result = await api.mergeCategories(mergeSource.id, mergeTargetId)
      if (result.success) {
        addAlert('success', result.message)
        loadCategories()
        closeMergeModal()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('categories.merge.failed'))
    }
  }

  const getMergeTargetOptions = () => {
    if (!mergeSource) return []
    return categories.filter(c => c.type === mergeSource.type && c.id !== mergeSource.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('categories.title')}</h1>
        <button onClick={openCreateForm} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('categories.newCategory')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Categories */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
            <h3 className="text-lg font-semibold text-green-800">{t('categories.incomeCategories')}</h3>
          </div>
          <div className="p-4">
            {incomeCategories.length === 0 ? (
              <p className="text-center text-gray-500 py-4">{t('categories.noCategories')}</p>
            ) : (
              <div className="space-y-2">
                {incomeCategories.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-3 ${c.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => openMergeModal(c)} className="text-purple-600 hover:text-purple-800 text-sm">{t('categories.merge.button')}</button>
                      <button onClick={() => openEditForm(c)} className="text-blue-600 hover:text-blue-800 text-sm">{t('common.edit')}</button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-sm">{t('common.delete')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Expense Categories */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
            <h3 className="text-lg font-semibold text-red-800">{t('categories.expenseCategories')}</h3>
          </div>
          <div className="p-4">
            {expenseCategories.length === 0 ? (
              <p className="text-center text-gray-500 py-4">{t('categories.noCategories')}</p>
            ) : (
              <div className="space-y-2">
                {expenseCategories.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-3 ${c.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button onClick={() => openMergeModal(c)} className="text-purple-600 hover:text-purple-800 text-sm">{t('categories.merge.button')}</button>
                      <button onClick={() => openEditForm(c)} className="text-blue-600 hover:text-blue-800 text-sm">{t('common.edit')}</button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-sm">{t('common.delete')}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{editingCategory ? t('categories.form.editTitle') : t('categories.form.newTitle')}</h3>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('categories.form.name')} *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('categories.form.type')}</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="income">{t('categories.types.income')}</option>
                  <option value="expense">{t('categories.types.expense')}</option>
                </select>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">{t('categories.form.active')}</label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">{editingCategory ? t('common.update') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && mergeSource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{t('categories.merge.title')}</h3>
              <button
                type="button"
                onClick={closeMergeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('categories.merge.sourceLabel')}</label>
                <div className="px-3 py-2 bg-gray-100 rounded-md text-gray-900 font-medium">{mergeSource.name}</div>
              </div>
              <p className="text-sm text-gray-600">
                {t('categories.merge.description', { source: mergeSource.name })}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('categories.merge.targetLabel')}</label>
                <select
                  value={mergeTargetId || ''}
                  onChange={(e) => setMergeTargetId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('categories.merge.selectTarget')}</option>
                  {getMergeTargetOptions().map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeMergeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleMerge}
                  disabled={!mergeTargetId}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('categories.merge.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
