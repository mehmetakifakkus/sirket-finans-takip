import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/currency'
import { formatDate } from '../utils/date'
import type { Project, ProjectMilestone } from '../types'

export function ProjectDetail() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project & { milestones?: ProjectMilestone[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<ProjectMilestone | null>(null)
  const { addAlert } = useAppStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [formData, setFormData] = useState({
    title: '',
    expected_date: '',
    expected_amount: '',
    currency: 'TRY' as 'TRY' | 'USD' | 'EUR',
    status: 'pending' as 'pending' | 'completed' | 'cancelled',
    notes: ''
  })

  useEffect(() => {
    loadProject()
  }, [id])

  const loadProject = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await window.api.getProject(parseInt(id))
      setProject(result as Project & { milestones?: ProjectMilestone[] })
    } catch {
      addAlert('error', t('common.dataLoadError'))
    } finally {
      setLoading(false)
    }
  }

  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return

    const data = {
      project_id: project.id,
      title: formData.title,
      expected_date: formData.expected_date || null,
      expected_amount: parseFloat(formData.expected_amount) || 0,
      currency: formData.currency,
      status: formData.status,
      notes: formData.notes
    }

    try {
      if (editingMilestone) {
        const result = await window.api.updateMilestone(editingMilestone.id, data)
        if (result.success) {
          addAlert('success', result.message)
          loadProject()
          closeMilestoneForm()
        } else {
          addAlert('error', result.message)
        }
      } else {
        const result = await window.api.createMilestone(data)
        if (result.success) {
          addAlert('success', result.message)
          loadProject()
          closeMilestoneForm()
        } else {
          addAlert('error', result.message)
        }
      }
    } catch {
      addAlert('error', t('common.error'))
    }
  }

  const handleDeleteMilestone = async (milestoneId: number) => {
    const confirmed = await window.api.confirm(t('projectDetail.confirmDeleteMilestone'))
    if (!confirmed) return

    try {
      const result = await window.api.deleteMilestone(milestoneId)
      if (result.success) {
        addAlert('success', result.message)
        loadProject()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.deleteFailed'))
    }
  }

  const openCreateMilestoneForm = () => {
    setEditingMilestone(null)
    setFormData({
      title: '',
      expected_date: '',
      expected_amount: '',
      currency: project?.currency as 'TRY' | 'USD' | 'EUR' || 'TRY',
      status: 'pending',
      notes: ''
    })
    setShowMilestoneForm(true)
  }

  const openEditMilestoneForm = (milestone: ProjectMilestone) => {
    setEditingMilestone(milestone)
    setFormData({
      title: milestone.title,
      expected_date: milestone.expected_date || '',
      expected_amount: milestone.expected_amount.toString(),
      currency: milestone.currency as 'TRY' | 'USD' | 'EUR',
      status: milestone.status,
      notes: milestone.notes || ''
    })
    setShowMilestoneForm(true)
  }

  const closeMilestoneForm = () => {
    setShowMilestoneForm(false)
    setEditingMilestone(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('projectDetail.notFound')}</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-blue-600 hover:text-blue-800">{t('common.goBack')}</button>
      </div>
    )
  }

  const progress = project.contract_amount > 0 ? ((project.collected_amount || 0) / project.contract_amount) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate('/projects')} className="text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('common.back')}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
          <p className="text-gray-500">{project.party_name}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500">{t('projectDetail.contractAmount')}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(project.contract_amount, project.currency as 'TRY' | 'USD' | 'EUR')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('projectDetail.collection')}</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(project.collected_amount || 0, project.currency as 'TRY' | 'USD' | 'EUR')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('projectDetail.remaining')}</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(project.remaining_amount || 0, project.currency as 'TRY' | 'USD' | 'EUR')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('projectDetail.endDate')}</p>
            <p className="text-2xl font-bold text-gray-900">{formatDate(project.end_date)}</p>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-500">{t('projectDetail.progress')}</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full">
            <div className="h-3 bg-blue-600 rounded-full" style={{ width: `${Math.min(progress, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('projectDetail.milestones')}</h3>
          <button onClick={openCreateMilestoneForm} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('projectDetail.addMilestone')}
          </button>
        </div>
        <div className="p-6">
          {project.milestones && project.milestones.length > 0 ? (
            <div className="space-y-3">
              {project.milestones.map((milestone) => (
                <div key={milestone.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{milestone.title}</p>
                      <p className="text-sm text-gray-500">{t('projectDetail.expected')}: {formatDate(milestone.expected_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(milestone.expected_amount, milestone.currency as 'TRY' | 'USD' | 'EUR')}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        milestone.status === 'completed' ? 'bg-green-100 text-green-800' :
                        milestone.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {milestone.status === 'completed' ? t('projectDetail.status.completed') : milestone.status === 'cancelled' ? t('projectDetail.status.cancelled') : t('projectDetail.status.pending')}
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button onClick={() => openEditMilestoneForm(milestone)} className="text-blue-600 hover:text-blue-800 text-sm">{t('common.edit')}</button>
                        <button onClick={() => handleDeleteMilestone(milestone.id)} className="text-red-600 hover:text-red-800 text-sm">{t('common.delete')}</button>
                      </div>
                    )}
                  </div>
                  {milestone.notes && <p className="mt-2 text-sm text-gray-500">{milestone.notes}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">{t('projectDetail.noMilestones')}</p>
          )}
        </div>
      </div>

      {/* Milestone Form Modal */}
      {showMilestoneForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{editingMilestone ? t('projectDetail.form.editTitle') : t('projectDetail.form.newTitle')}</h3>
              <button
                type="button"
                onClick={closeMilestoneForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleMilestoneSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.form.title')} *</label>
                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.form.expectedAmount')}</label>
                  <input type="number" step="0.01" value={formData.expected_amount} onChange={(e) => setFormData({ ...formData, expected_amount: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.form.currency')}</label>
                  <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'TRY' | 'USD' | 'EUR' })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.form.expectedDate')}</label>
                  <input type="date" value={formData.expected_date} onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.form.status')}</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'completed' | 'cancelled' })} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                    <option value="pending">{t('projectDetail.status.pending')}</option>
                    <option value="completed">{t('projectDetail.status.completed')}</option>
                    <option value="cancelled">{t('projectDetail.status.cancelled')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.form.notes')}</label>
                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={2} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeMilestoneForm} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                <button type="submit" className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">{editingMilestone ? t('common.update') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
