import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/currency'
import { formatDate } from '../utils/date'
import type { Project, Party } from '../types'

const statusColors = {
  active: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  on_hold: 'bg-yellow-100 text-yellow-800'
}

const isProjectIncomplete = (project: Project): boolean => {
  return !project.contract_amount ||
         project.contract_amount === 0 ||
         !project.start_date ||
         !project.end_date
}

export function Projects() {
  const { t } = useTranslation()

  const getIncompleteMissingFields = (project: Project): string[] => {
    const missing: string[] = []
    if (!project.contract_amount || project.contract_amount === 0) missing.push(t('projects.form.contractAmount'))
    if (!project.start_date) missing.push(t('projects.form.startDate'))
    if (!project.end_date) missing.push(t('projects.form.endDate'))
    return missing
  }

  const statusLabels = {
    active: t('projects.status.active'),
    completed: t('projects.status.completed'),
    cancelled: t('projects.status.cancelled'),
    on_hold: t('projects.status.onHold')
  }
  const [projects, setProjects] = useState<Project[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const { addAlert } = useAppStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [filters, setFilters] = useState({ party_id: '', status: '' })

  const [formData, setFormData] = useState({
    party_id: '',
    title: '',
    contract_amount: '',
    currency: 'TRY' as 'TRY' | 'USD' | 'EUR',
    start_date: '',
    end_date: '',
    status: 'active' as 'active' | 'completed' | 'cancelled' | 'on_hold',
    notes: ''
  })

  useEffect(() => {
    loadParties()
    loadProjects()
  }, [])

  useEffect(() => {
    loadProjects()
  }, [filters])

  const loadParties = async () => {
    try {
      const result = await window.api.getParties({ type: 'customer' })
      setParties(result as Party[])
    } catch {
      addAlert('error', t('projects.errors.partiesLoadFailed'))
    }
  }

  const loadProjects = async () => {
    setLoading(true)
    try {
      const filterParams: Record<string, string | number | undefined> = {}
      if (filters.party_id) filterParams.party_id = parseInt(filters.party_id)
      if (filters.status) filterParams.status = filters.status

      const result = await window.api.getProjects(filterParams)
      setProjects(result as Project[])
    } catch {
      addAlert('error', t('projects.errors.projectsLoadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      party_id: parseInt(formData.party_id),
      title: formData.title,
      contract_amount: parseFloat(formData.contract_amount) || 0,
      currency: formData.currency,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      status: formData.status,
      notes: formData.notes
    }

    try {
      if (editingProject) {
        const result = await window.api.updateProject(editingProject.id, data)
        if (result.success) {
          addAlert('success', result.message)
          loadProjects()
          closeForm()
        } else {
          addAlert('error', result.message)
        }
      } else {
        const result = await window.api.createProject(data)
        if (result.success) {
          addAlert('success', result.message)
          loadProjects()
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
    const confirmed = await window.api.confirm(t('projects.confirmDelete'))
    if (!confirmed) return

    try {
      const result = await window.api.deleteProject(id)
      if (result.success) {
        addAlert('success', result.message)
        loadProjects()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.deleteFailed'))
    }
  }

  const openCreateForm = () => {
    setEditingProject(null)
    setFormData({
      party_id: '',
      title: '',
      contract_amount: '',
      currency: 'TRY',
      start_date: '',
      end_date: '',
      status: 'active',
      notes: ''
    })
    setShowForm(true)
  }

  const openEditForm = (project: Project) => {
    setEditingProject(project)
    setFormData({
      party_id: project.party_id.toString(),
      title: project.title,
      contract_amount: project.contract_amount.toString(),
      currency: project.currency as 'TRY' | 'USD' | 'EUR',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
      status: project.status,
      notes: project.notes || ''
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingProject(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('projects.title')}</h1>
        <button onClick={openCreateForm} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('projects.newProject')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projects.filters.customer')}</label>
            <select value={filters.party_id} onChange={(e) => setFilters({ ...filters, party_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">{t('common.all')}</option>
              {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('projects.filters.status')}</label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option value="">{t('common.all')}</option>
              <option value="active">{t('projects.status.active')}</option>
              <option value="completed">{t('projects.status.completed')}</option>
              <option value="on_hold">{t('projects.status.onHold')}</option>
              <option value="cancelled">{t('projects.status.cancelled')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Project Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center text-gray-500">
          {t('projects.noProjects')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Link to={`/projects/${project.id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600">{project.title}</Link>
                    <p className="text-sm text-gray-500">{project.party_name}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[project.status]}`}>
                      {statusLabels[project.status]}
                    </span>
                    {isProjectIncomplete(project) && (
                      <span
                        className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800"
                        title={`${t('projects.incomplete')}: ${getIncompleteMissingFields(project).join(', ')}`}
                      >
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {t('projects.incomplete')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">{t('projects.contractAmount')}</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(project.contract_amount, project.currency as 'TRY' | 'USD' | 'EUR')}</p>
                  </div>

                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">{t('projects.collection')}</span>
                      <span className="font-medium">{project.percentage?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-blue-600 rounded-full" style={{ width: `${Math.min(project.percentage || 0, 100)}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{formatCurrency(project.collected_amount || 0, project.currency as 'TRY' | 'USD' | 'EUR')}</span>
                      <span>{t('projects.remaining')}: {formatCurrency(project.remaining_amount || 0, project.currency as 'TRY' | 'USD' | 'EUR')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <div>
                      <p>{t('projects.startDate')}</p>
                      <p className="font-medium text-gray-700">{formatDate(project.start_date)}</p>
                    </div>
                    <div>
                      <p>{t('projects.endDate')}</p>
                      <p className="font-medium text-gray-700">{formatDate(project.end_date)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                <Link to={`/projects/${project.id}`} className="text-blue-600 hover:text-blue-800 text-sm">{t('common.detail')}</Link>
                {isAdmin && (
                  <>
                    <button onClick={() => openEditForm(project)} className="text-blue-600 hover:text-blue-800 text-sm">{t('common.edit')}</button>
                    <button onClick={() => handleDelete(project.id)} className="text-red-600 hover:text-red-800 text-sm">{t('common.delete')}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{editingProject ? t('projects.form.editTitle') : t('projects.form.newTitle')}</h3>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.form.projectName')} *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.form.customer')} *</label>
                <select value={formData.party_id} onChange={(e) => setFormData({ ...formData, party_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                  <option value="">{t('common.select')}</option>
                  {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.form.contractAmount')}</label>
                  <input type="number" step="0.01" value={formData.contract_amount} onChange={(e) => setFormData({ ...formData, contract_amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.form.currency')}</label>
                  <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'TRY' | 'USD' | 'EUR' })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.form.startDate')}</label>
                  <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.form.endDate')}</label>
                  <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.form.status')}</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'completed' | 'cancelled' | 'on_hold' })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="active">{t('projects.status.active')}</option>
                  <option value="completed">{t('projects.status.completed')}</option>
                  <option value="on_hold">{t('projects.status.onHold')}</option>
                  <option value="cancelled">{t('projects.status.cancelled')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projects.form.notes')}</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={2} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">{editingProject ? t('common.update') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
