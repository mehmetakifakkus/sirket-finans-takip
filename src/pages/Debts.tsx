import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/currency'
import { formatDate, getToday, isOverdue } from '../utils/date'
import type { Debt, Party } from '../types'

export function Debts() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)
  const { addAlert } = useAppStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [filters, setFilters] = useState({ kind: '', party_id: '', status: 'open' })

  const [formData, setFormData] = useState({
    kind: 'debt' as 'debt' | 'receivable',
    party_id: '',
    principal_amount: '',
    currency: 'TRY' as 'TRY' | 'USD' | 'EUR',
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

  const loadParties = async () => {
    try {
      const result = await window.api.getParties()
      setParties(result as Party[])
    } catch {
      addAlert('error', 'Taraflar yuklenemedi')
    }
  }

  const loadDebts = async () => {
    setLoading(true)
    try {
      const filterParams: Record<string, string | number | undefined> = {}
      if (filters.kind) filterParams.kind = filters.kind
      if (filters.party_id) filterParams.party_id = parseInt(filters.party_id)
      if (filters.status) filterParams.status = filters.status

      const result = await window.api.getDebts(filterParams)
      setDebts(result as Debt[])
    } catch {
      addAlert('error', 'Veriler yuklenemedi')
    } finally {
      setLoading(false)
    }
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
        const result = await window.api.updateDebt(editingDebt.id, data)
        if (result.success) {
          addAlert('success', result.message)
          loadDebts()
          closeForm()
        } else {
          addAlert('error', result.message)
        }
      } else {
        const result = await window.api.createDebt(data)
        if (result.success) {
          addAlert('success', result.message)
          loadDebts()
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
    const confirmed = await window.api.confirm('Bu kaydi silmek istediginizden emin misiniz?')
    if (!confirmed) return

    try {
      const result = await window.api.deleteDebt(id)
      if (result.success) {
        addAlert('success', result.message)
        loadDebts()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', 'Silme islemi basarisiz')
    }
  }

  const handleExport = async () => {
    try {
      const result = await window.api.exportDebts(filters)
      if (result.success) {
        addAlert('success', 'CSV dosyasi olusturuldu')
      }
    } catch {
      addAlert('error', 'Disari aktarma basarisiz')
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Borc / Alacak</h1>
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
            Alacak
          </button>
          <button onClick={() => openCreateForm('debt')} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Borc
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tip</label>
            <select value={filters.kind} onChange={(e) => setFilters({ ...filters, kind: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">Tumu</option>
              <option value="debt">Borc</option>
              <option value="receivable">Alacak</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Taraf</label>
            <select value={filters.party_id} onChange={(e) => setFilters({ ...filters, party_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">Tumu</option>
              {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Durum</label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">Tumu</option>
              <option value="open">Acik</option>
              <option value="closed">Kapali</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-600">Toplam Alacak</p>
          <p className="text-xl font-bold text-blue-700">{formatCurrency(totals.receivable, 'TRY')}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <p className="text-sm text-orange-600">Toplam Borc</p>
          <p className="text-xl font-bold text-orange-700">{formatCurrency(totals.debt, 'TRY')}</p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tip</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Taraf</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Anapara</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Kalan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Islemler</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {debts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Kayit bulunamadi</td>
                </tr>
              ) : (
                debts.map((debt) => (
                  <tr key={debt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${debt.kind === 'receivable' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                        {debt.kind === 'receivable' ? 'Alacak' : 'Borc'}
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
                        {debt.status === 'open' ? 'Acik' : 'Kapali'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link to={`/debts/${debt.id}`} className="text-blue-600 hover:text-blue-800 mr-3">Detay</Link>
                      {isAdmin && (
                        <>
                          <button onClick={() => openEditForm(debt)} className="text-blue-600 hover:text-blue-800 mr-3">Duzenle</button>
                          <button onClick={() => handleDelete(debt.id)} className="text-red-600 hover:text-red-800">Sil</button>
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
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{editingDebt ? 'Kayit Duzenle' : `Yeni ${formData.kind === 'receivable' ? 'Alacak' : 'Borc'}`}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taraf *</label>
                <select value={formData.party_id} onChange={(e) => setFormData({ ...formData, party_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                  <option value="">Secin</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anapara *</label>
                  <input type="number" step="0.01" value={formData.principal_amount} onChange={(e) => setFormData({ ...formData, principal_amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Para Birimi</label>
                  <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'TRY' | 'USD' | 'EUR' })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Baslangic</label>
                  <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vade</label>
                  <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={2} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Iptal</button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">{editingDebt ? 'Guncelle' : 'Kaydet'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
