import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/currency'
import { formatDate, getToday, isOverdue } from '../utils/date'
import type { Debt, Installment } from '../types'

export function DebtDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [debt, setDebt] = useState<Debt | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null)
  const [showInstallmentForm, setShowInstallmentForm] = useState(false)
  const { addAlert } = useAppStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: getToday(),
    method: 'bank' as 'cash' | 'bank' | 'card' | 'other',
    notes: ''
  })

  const [installmentCount, setInstallmentCount] = useState('3')

  useEffect(() => {
    loadDebt()
  }, [id])

  const loadDebt = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await window.api.getDebt(parseInt(id))
      setDebt(result as Debt)
    } catch {
      addAlert('error', 'Veri yuklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateInstallments = async () => {
    if (!debt) return

    try {
      const result = await window.api.createInstallments(debt.id, parseInt(installmentCount))
      if (result.success) {
        addAlert('success', result.message)
        loadDebt()
        setShowInstallmentForm(false)
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', 'Taksitler olusturulamadi')
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInstallment) return

    try {
      const result = await window.api.addInstallmentPayment(selectedInstallment.id, {
        amount: parseFloat(paymentData.amount),
        date: paymentData.date,
        method: paymentData.method,
        notes: paymentData.notes
      })
      if (result.success) {
        addAlert('success', result.message)
        loadDebt()
        closePaymentForm()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', 'Odeme eklenemedi')
    }
  }

  const handleDeleteInstallment = async (installmentId: number) => {
    const confirmed = await window.api.confirm('Bu taksiti silmek istediginizden emin misiniz?')
    if (!confirmed) return

    try {
      const result = await window.api.deleteInstallment(installmentId)
      if (result.success) {
        addAlert('success', result.message)
        loadDebt()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', 'Silme islemi basarisiz')
    }
  }

  const openPaymentForm = (installment: Installment) => {
    setSelectedInstallment(installment)
    setPaymentData({
      amount: (installment.amount - installment.paid_amount).toString(),
      date: getToday(),
      method: 'bank',
      notes: ''
    })
    setShowPaymentForm(true)
  }

  const closePaymentForm = () => {
    setShowPaymentForm(false)
    setSelectedInstallment(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!debt) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Kayit bulunamadi</p>
        <button onClick={() => navigate('/debts')} className="mt-4 text-blue-600 hover:text-blue-800">Geri don</button>
      </div>
    )
  }

  const progress = debt.principal_amount > 0 ? ((debt.total_paid || 0) / debt.principal_amount) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/debts')} className="text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Geri
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{debt.party_name}</h1>
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${debt.kind === 'receivable' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
            {debt.kind === 'receivable' ? 'Alacak' : 'Borc'}
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">Anapara</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(debt.principal_amount, debt.currency as 'TRY' | 'USD' | 'EUR')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Odenen</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(debt.total_paid || 0, debt.currency as 'TRY' | 'USD' | 'EUR')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Kalan</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(debt.remaining_amount || 0, debt.currency as 'TRY' | 'USD' | 'EUR')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Vade</p>
            <p className={`text-2xl font-bold ${isOverdue(debt.due_date) ? 'text-red-600' : 'text-gray-900'}`}>{formatDate(debt.due_date)}</p>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">Ilerleme</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full">
            <div className="h-3 bg-blue-600 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Installments */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Taksitler</h3>
          {debt.installments?.length === 0 && (
            <button onClick={() => setShowInstallmentForm(true)} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Taksit Olustur
            </button>
          )}
        </div>
        <div className="p-6">
          {debt.installments && debt.installments.length > 0 ? (
            <div className="space-y-3">
              {debt.installments.map((installment, index) => (
                <div key={installment.id} className={`p-4 rounded-lg border ${isOverdue(installment.due_date) && installment.status !== 'paid' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">Taksit {index + 1}</span>
                      <p className={`text-sm ${isOverdue(installment.due_date) && installment.status !== 'paid' ? 'text-red-600' : 'text-gray-500'}`}>
                        Vade: {formatDate(installment.due_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(installment.amount, installment.currency as 'TRY' | 'USD' | 'EUR')}</p>
                      <p className="text-sm text-green-600">Odenen: {formatCurrency(installment.paid_amount, installment.currency as 'TRY' | 'USD' | 'EUR')}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        installment.status === 'paid' ? 'bg-green-100 text-green-800' :
                        installment.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {installment.status === 'paid' ? 'Odendi' : installment.status === 'partial' ? 'Kismi' : 'Bekliyor'}
                      </span>
                      {installment.status !== 'paid' && (
                        <button onClick={() => openPaymentForm(installment)} className="text-blue-600 hover:text-blue-800 text-sm">Odeme Yap</button>
                      )}
                      {isAdmin && (
                        <button onClick={() => handleDeleteInstallment(installment.id)} className="text-red-600 hover:text-red-800 text-sm">Sil</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">Henuz taksit olusturulmamis</p>
          )}
        </div>
      </div>

      {/* Notes */}
      {debt.notes && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Notlar</h3>
          <p className="text-gray-600">{debt.notes}</p>
        </div>
      )}

      {/* Installment Creation Modal */}
      {showInstallmentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Taksit Olustur</h3>
              <button
                type="button"
                onClick={() => setShowInstallmentForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taksit Sayisi</label>
                <input type="number" min="1" value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <p className="text-sm text-gray-500">Aylik taksit tutari: {formatCurrency(debt.principal_amount / parseInt(installmentCount || '1'), debt.currency as 'TRY' | 'USD' | 'EUR')}</p>
              <div className="flex justify-end space-x-3 pt-4">
                <button onClick={() => setShowInstallmentForm(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Iptal</button>
                <button onClick={handleCreateInstallments} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Olustur</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentForm && selectedInstallment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Odeme Yap</h3>
              <button
                type="button"
                onClick={closePaymentForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handlePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tutar *</label>
                <input type="number" step="0.01" value={paymentData.amount} onChange={(e) => setPaymentData({ ...paymentData, amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
                <input type="date" value={paymentData.date} onChange={(e) => setPaymentData({ ...paymentData, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yontem</label>
                <select value={paymentData.method} onChange={(e) => setPaymentData({ ...paymentData, method: e.target.value as 'cash' | 'bank' | 'card' | 'other' })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="bank">Banka Transferi</option>
                  <option value="cash">Nakit</option>
                  <option value="card">Kredi Karti</option>
                  <option value="other">Diger</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                <textarea value={paymentData.notes} onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={2} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closePaymentForm} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Iptal</button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Odeme Yap</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
