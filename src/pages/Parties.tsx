import { useEffect, useState } from 'react'
import { api } from '@/api'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import type { Party, PartyType } from '../types'

// Grant types that show grant fields in form
const GRANT_TYPES: PartyType[] = ['tubitak', 'kosgeb', 'individual']

// Default grant values by type
const GRANT_DEFAULTS: Record<string, { grant_rate: number | null; grant_limit: number | null; vat_included: boolean }> = {
  tubitak: { grant_rate: 0.75, grant_limit: 2333000, vat_included: false },
  kosgeb: { grant_rate: 0.80, grant_limit: 1456000, vat_included: false },
  individual: { grant_rate: 1.00, grant_limit: null, vat_included: true },
}

export function Parties() {
  const { t } = useTranslation()

  const partyTypes: Record<PartyType, string> = {
    customer: t('parties.types.customer'),
    vendor: t('parties.types.vendor'),
    tubitak: t('parties.types.tubitak'),
    kosgeb: t('parties.types.kosgeb'),
    individual: t('parties.types.individual'),
    other: t('parties.types.other')
  }
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingParty, setEditingParty] = useState<Party | null>(null)
  const [filterType, setFilterType] = useState<string>('')
  const { addAlert } = useAppStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [formData, setFormData] = useState({
    type: 'customer' as PartyType,
    name: '',
    tax_no: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    grant_rate: null as number | null,
    grant_limit: null as number | null,
    vat_included: true
  })

  // Merge states
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergingParty, setMergingParty] = useState<Party | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState<string>('')

  useEffect(() => {
    loadParties()
  }, [filterType])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showMergeModal) {
          closeMergeModal()
        } else if (showForm) {
          closeForm()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showForm, showMergeModal])

  const loadParties = async () => {
    try {
      const filters = filterType ? { type: filterType } : undefined
      const result = await api.getParties(filters)
      setParties(result as Party[])
    } catch {
      addAlert('error', t('parties.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingParty) {
        const result = await api.updateParty(editingParty.id, formData)
        if (result.success) {
          addAlert('success', result.message)
          loadParties()
          closeForm()
        } else {
          addAlert('error', result.message)
        }
      } else {
        const result = await api.createParty(formData)
        if (result.success) {
          addAlert('success', result.message)
          loadParties()
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
    const confirmed = await api.confirm(t('parties.confirmDelete'))
    if (!confirmed) return

    try {
      const result = await api.deleteParty(id)
      if (result.success) {
        addAlert('success', result.message)
        loadParties()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.deleteFailed'))
    }
  }

  const openCreateForm = () => {
    setEditingParty(null)
    setFormData({
      type: 'customer',
      name: '',
      tax_no: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      grant_rate: null,
      grant_limit: null,
      vat_included: true
    })
    setShowForm(true)
  }

  const openEditForm = (party: Party) => {
    setEditingParty(party)
    setFormData({
      type: party.type,
      name: party.name,
      tax_no: party.tax_no || '',
      phone: party.phone || '',
      email: party.email || '',
      address: party.address || '',
      notes: party.notes || '',
      grant_rate: party.grant_rate,
      grant_limit: party.grant_limit,
      vat_included: party.vat_included ?? true
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingParty(null)
  }

  const openMergeModal = (party: Party) => {
    setMergingParty(party)
    setMergeTargetId('')
    setShowMergeModal(true)
  }

  const closeMergeModal = () => {
    setShowMergeModal(false)
    setMergingParty(null)
    setMergeTargetId('')
  }

  const handleMerge = async () => {
    if (!mergingParty || !mergeTargetId) return

    try {
      const result = await api.mergeParties(mergingParty.id, parseInt(mergeTargetId))
      if (result.success) {
        addAlert('success', t('parties.merge.success'))
        loadParties()
        closeMergeModal()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('parties.merge.failed'))
    }
  }

  // Parties available as merge targets (exclude the source party)
  const mergeTargetOptions = parties.filter(p => mergingParty && p.id !== mergingParty.id)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('parties.title')}</h1>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('parties.newParty')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">{t('parties.filters.type')}:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">{t('common.all')}</option>
            <option value="customer">{t('parties.types.customer')}</option>
            <option value="vendor">{t('parties.types.vendor')}</option>
            <option value="tubitak">{t('parties.types.tubitak')}</option>
            <option value="kosgeb">{t('parties.types.kosgeb')}</option>
            <option value="individual">{t('parties.types.individual')}</option>
            <option value="other">{t('parties.types.other')}</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('parties.table.name')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('parties.table.type')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('parties.table.taxNo')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('parties.table.phone')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('parties.table.email')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {parties.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {t('parties.noParties')}
                </td>
              </tr>
            ) : (
              parties.map((party) => (
                <tr key={party.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{party.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      party.type === 'customer' ? 'bg-blue-100 text-blue-800' :
                      party.type === 'vendor' ? 'bg-orange-100 text-orange-800' :
                      party.type === 'tubitak' ? 'bg-green-100 text-green-800' :
                      party.type === 'kosgeb' ? 'bg-purple-100 text-purple-800' :
                      party.type === 'individual' ? 'bg-cyan-100 text-cyan-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {partyTypes[party.type]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{party.tax_no || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{party.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{party.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => openEditForm(party)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => openMergeModal(party)}
                          className="text-amber-600 hover:text-amber-800 mr-3"
                        >
                          {t('parties.merge.button')}
                        </button>
                        <button
                          onClick={() => handleDelete(party.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          {t('common.delete')}
                        </button>
                      </>
                    )}
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
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingParty ? t('parties.form.editTitle') : t('parties.form.newTitle')}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('parties.form.type')}</label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    const newType = e.target.value as PartyType
                    const defaults = GRANT_DEFAULTS[newType]
                    if (defaults && !editingParty) {
                      // Auto-fill grant defaults for new parties
                      setFormData({
                        ...formData,
                        type: newType,
                        grant_rate: defaults.grant_rate,
                        grant_limit: defaults.grant_limit,
                        vat_included: defaults.vat_included
                      })
                    } else {
                      setFormData({ ...formData, type: newType })
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="customer">{t('parties.types.customer')}</option>
                  <option value="vendor">{t('parties.types.vendor')}</option>
                  <option value="tubitak">{t('parties.types.tubitak')}</option>
                  <option value="kosgeb">{t('parties.types.kosgeb')}</option>
                  <option value="individual">{t('parties.types.individual')}</option>
                  <option value="other">{t('parties.types.other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('parties.form.name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              {/* Tax, phone, email, address - hide for grant types */}
              {!GRANT_TYPES.includes(formData.type) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('parties.form.taxNo')}</label>
                    <input
                      type="text"
                      value={formData.tax_no}
                      onChange={(e) => setFormData({ ...formData, tax_no: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('parties.form.phone')}</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('parties.form.email')}</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('parties.form.address')}</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows={2}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('parties.form.notes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                />
              </div>

              {/* Grant fields - only show for grant types */}
              {GRANT_TYPES.includes(formData.type) && (
                <div className="border-t border-gray-200 pt-4 mt-4 space-y-4">
                  <h4 className="text-sm font-semibold text-gray-900">{t('parties.grantSettings')}</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('parties.grantRate')} (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={formData.grant_rate !== null ? formData.grant_rate * 100 : ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          grant_rate: e.target.value ? parseFloat(e.target.value) / 100 : null
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="75"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('parties.grantLimit')} (TRY)
                      </label>
                      <input
                        type="number"
                        step="1000"
                        min="0"
                        value={formData.grant_limit ?? ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          grant_limit: e.target.value ? parseFloat(e.target.value) : null
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder={formData.type === 'individual' ? t('parties.unlimited') : '2333000'}
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="vat_included"
                      checked={formData.vat_included}
                      onChange={(e) => setFormData({ ...formData, vat_included: e.target.checked })}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label htmlFor="vat_included" className="ml-2 text-sm text-gray-700">
                      {t('parties.vatIncluded')}
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  {editingParty ? t('common.update') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && mergingParty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{t('parties.merge.title')}</h3>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('parties.merge.sourceLabel')}</label>
                <div className="px-3 py-2 bg-gray-100 rounded-md text-gray-900 font-medium">
                  {mergingParty.name}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('parties.merge.targetLabel')}</label>
                <select
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('parties.merge.selectTarget')}</option>
                  {mergeTargetOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({partyTypes[p.type]})</option>
                  ))}
                </select>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <p className="text-sm text-amber-800">
                  {t('parties.merge.description', { source: mergingParty.name })}
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
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
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {t('parties.merge.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
