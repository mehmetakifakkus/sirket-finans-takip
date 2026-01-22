import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import { formatDate, getToday } from '../utils/date'
import type { ExchangeRate } from '../types'

export function ExchangeRates() {
  const { t } = useTranslation()
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [latestRates, setLatestRates] = useState<Record<string, { rate: number; date: string }>>({})
  const [loading, setLoading] = useState(true)
  const [fetchingTCMB, setFetchingTCMB] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null)
  const { addAlert } = useAppStore()

  const [formData, setFormData] = useState({
    rate_date: getToday(),
    quote_currency: 'USD' as 'USD' | 'EUR',
    rate: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [ratesRes, latestRes] = await Promise.all([
        window.api.getExchangeRates(),
        window.api.getLatestRates()
      ])
      setRates(ratesRes as ExchangeRate[])
      setLatestRates(latestRes as Record<string, { rate: number; date: string }>)
    } catch {
      addAlert('error', t('common.dataNotLoaded'))
    } finally {
      setLoading(false)
    }
  }

  const handleFetchTCMB = async () => {
    setFetchingTCMB(true)
    try {
      const result = await window.api.fetchTCMBRates()
      if (result.success) {
        addAlert('success', result.message)
        loadData()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('exchangeRates.tcmbFailed'))
    } finally {
      setFetchingTCMB(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      rate_date: formData.rate_date,
      quote_currency: formData.quote_currency,
      rate: parseFloat(formData.rate)
    }

    try {
      if (editingRate) {
        const result = await window.api.updateExchangeRate(editingRate.id, data)
        if (result.success) {
          addAlert('success', result.message)
          loadData()
          closeForm()
        } else {
          addAlert('error', result.message)
        }
      } else {
        const result = await window.api.createExchangeRate(data)
        if (result.success) {
          addAlert('success', result.message)
          loadData()
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
    const confirmed = await window.api.confirm(t('exchangeRates.confirmDelete'))
    if (!confirmed) return

    try {
      const result = await window.api.deleteExchangeRate(id)
      if (result.success) {
        addAlert('success', result.message)
        loadData()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.deleteFailed'))
    }
  }

  const openCreateForm = () => {
    setEditingRate(null)
    setFormData({ rate_date: getToday(), quote_currency: 'USD', rate: '' })
    setShowForm(true)
  }

  const openEditForm = (rate: ExchangeRate) => {
    setEditingRate(rate)
    setFormData({
      rate_date: rate.rate_date,
      quote_currency: rate.quote_currency as 'USD' | 'EUR',
      rate: rate.rate.toString()
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingRate(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('exchangeRates.title')}</h1>
        <div className="flex space-x-3">
          <button
            onClick={handleFetchTCMB}
            disabled={fetchingTCMB}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            {fetchingTCMB ? (
              <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            {t('exchangeRates.fetchFromTCMB')}
          </button>
          <button onClick={openCreateForm} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('exchangeRates.manualAdd')}
          </button>
        </div>
      </div>

      {/* Current Rates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">USD / TRY</p>
              <p className="text-3xl font-bold text-green-600">
                {latestRates.USD ? latestRates.USD.rate.toFixed(4) : '-'}
              </p>
              {latestRates.USD && (
                <p className="text-xs text-gray-400 mt-1">{formatDate(latestRates.USD.date)}</p>
              )}
            </div>
            <div className="text-4xl text-green-500">$</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">EUR / TRY</p>
              <p className="text-3xl font-bold text-blue-600">
                {latestRates.EUR ? latestRates.EUR.rate.toFixed(4) : '-'}
              </p>
              {latestRates.EUR && (
                <p className="text-xs text-gray-400 mt-1">{formatDate(latestRates.EUR.date)}</p>
              )}
            </div>
            <div className="text-4xl text-blue-500">&euro;</div>
          </div>
        </div>
      </div>

      {/* Rate History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('exchangeRates.rateHistory')}</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.currency')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('exchangeRates.rate')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('exchangeRates.source')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">{t('exchangeRates.noRates')}</td>
              </tr>
            ) : (
              rates.slice(0, 50).map((rate) => (
                <tr key={rate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(rate.rate_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${rate.quote_currency === 'USD' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                      {rate.quote_currency}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono">{rate.rate.toFixed(4)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rate.source === 'tcmb' ? t('exchangeRates.tcmb') : t('exchangeRates.manual')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button onClick={() => openEditForm(rate)} className="text-blue-600 hover:text-blue-800 mr-3">{t('common.edit')}</button>
                    <button onClick={() => handleDelete(rate.id)} className="text-red-600 hover:text-red-800">{t('common.delete')}</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{editingRate ? t('exchangeRates.editRate') : t('exchangeRates.newRate')}</h3>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')} *</label>
                <input type="date" value={formData.rate_date} onChange={(e) => setFormData({ ...formData, rate_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.currency')}</label>
                <select value={formData.quote_currency} onChange={(e) => setFormData({ ...formData, quote_currency: e.target.value as 'USD' | 'EUR' })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('exchangeRates.rateLabel', { currency: formData.quote_currency })} *</label>
                <input type="number" step="0.0001" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">{editingRate ? t('common.update') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
