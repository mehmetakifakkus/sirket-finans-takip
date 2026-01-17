import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import type { Category } from '../types'

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [filterType, _setFilterType] = useState<string>('')
  const { addAlert } = useAppStore()

  const [formData, setFormData] = useState({
    name: '',
    type: 'income' as 'income' | 'expense',
    parent_id: null as number | null,
    is_active: true
  })

  useEffect(() => {
    loadCategories()
  }, [filterType])

  const loadCategories = async () => {
    try {
      const result = await window.api.getCategories(filterType || undefined)
      setCategories(result as Category[])
    } catch {
      addAlert('error', 'Kategoriler yuklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingCategory) {
        const result = await window.api.updateCategory(editingCategory.id, formData)
        if (result.success) {
          addAlert('success', result.message)
          loadCategories()
          closeForm()
        } else {
          addAlert('error', result.message)
        }
      } else {
        const result = await window.api.createCategory(formData)
        if (result.success) {
          addAlert('success', result.message)
          loadCategories()
          closeForm()
        } else {
          addAlert('error', result.message)
        }
      }
    } catch {
      addAlert('error', 'Bir hata olustu')
    }
  }

  const handleDelete = async (id: number) => {
    const confirmed = await window.api.confirm('Bu kategoriyi silmek istediginizden emin misiniz?')
    if (!confirmed) return

    try {
      const result = await window.api.deleteCategory(id)
      if (result.success) {
        addAlert('success', result.message)
        loadCategories()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', 'Silme islemi basarisiz')
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
        <h1 className="text-2xl font-bold text-gray-900">Kategoriler</h1>
        <button onClick={openCreateForm} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Kategori
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Categories */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
            <h3 className="text-lg font-semibold text-green-800">Gelir Kategorileri</h3>
          </div>
          <div className="p-4">
            {incomeCategories.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Kategori yok</p>
            ) : (
              <div className="space-y-2">
                {incomeCategories.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-3 ${c.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                    <div>
                      <button onClick={() => openEditForm(c)} className="text-blue-600 hover:text-blue-800 mr-2 text-sm">Duzenle</button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-sm">Sil</button>
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
            <h3 className="text-lg font-semibold text-red-800">Gider Kategorileri</h3>
          </div>
          <div className="p-4">
            {expenseCategories.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Kategori yok</p>
            ) : (
              <div className="space-y-2">
                {expenseCategories.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-3 ${c.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                    <div>
                      <button onClick={() => openEditForm(c)} className="text-blue-600 hover:text-blue-800 mr-2 text-sm">Duzenle</button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800 text-sm">Sil</button>
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
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{editingCategory ? 'Kategori Duzenle' : 'Yeni Kategori'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ad *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tip</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="income">Gelir</option>
                  <option value="expense">Gider</option>
                </select>
              </div>
              <div className="flex items-center">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} className="h-4 w-4 text-blue-600 border-gray-300 rounded" />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">Aktif</label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Iptal</button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">{editingCategory ? 'Guncelle' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
