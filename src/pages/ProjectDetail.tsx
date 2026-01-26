import { useEffect, useState } from 'react'
import { api } from '@/api'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/currency'
import { formatDate } from '../utils/date'
import type { Project, ProjectMilestone, Transaction, Category, Party, ProjectGrant, Currency } from '../types'

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

  // Transaction states
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income')
  const [categories, setCategories] = useState<Category[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [transactionFormData, setTransactionFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    currency: 'TRY' as 'TRY' | 'USD' | 'EUR',
    party_id: '',
    category_id: '',
    vat_rate: '0',
    withholding_rate: '0',
    description: ''
  })

  // Add existing transactions modal states
  const [showAddExistingModal, setShowAddExistingModal] = useState(false)
  const [unassignedTransactions, setUnassignedTransactions] = useState<Transaction[]>([])
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<number>>(new Set())
  const [unassignedLoading, setUnassignedLoading] = useState(false)
  const [unassignedFilters, setUnassignedFilters] = useState({
    type: '' as '' | 'income' | 'expense',
    dateRange: '30' as '30' | '90' | 'all'
  })

  // Grant states
  const [grants, setGrants] = useState<ProjectGrant[]>([])
  const [showGrantForm, setShowGrantForm] = useState(false)
  const [editingGrant, setEditingGrant] = useState<ProjectGrant | null>(null)
  const [grantFormData, setGrantFormData] = useState({
    provider_type: 'tubitak' as 'tubitak' | 'kosgeb' | 'sponsor' | 'other',
    provider_name: '',
    funding_rate: '' as string,
    funding_amount: '' as string,
    vat_excluded: true,
    approved_amount: '',
    received_amount: '',
    currency: 'TRY' as Currency,
    status: 'pending' as 'pending' | 'approved' | 'partial' | 'received' | 'rejected',
    notes: '',
    use_rate: true
  })
  const [calculatedGrantAmount, setCalculatedGrantAmount] = useState<number>(0)
  const [grantTotals, setGrantTotals] = useState({ total_approved: 0, total_received: 0 })

  useEffect(() => {
    loadProject()
    loadTransactions()
    loadCategories()
    loadParties()
    loadGrants()
  }, [id])

  const loadTransactions = async () => {
    if (!id) return
    try {
      const result = await api.getTransactionsByProject(parseInt(id))
      setTransactions(result as Transaction[])
    } catch {
      // Silent fail - transactions are optional
    }
  }

  const loadCategories = async () => {
    try {
      const result = await api.getCategories()
      setCategories(result as Category[])
    } catch {
      // Silent fail
    }
  }

  const loadParties = async () => {
    try {
      const result = await api.getParties()
      setParties(result as Party[])
    } catch {
      // Silent fail
    }
  }

  const loadProject = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await api.getProject(parseInt(id))
      setProject(result as Project & { milestones?: ProjectMilestone[] })
    } catch {
      addAlert('error', t('common.dataLoadError'))
    } finally {
      setLoading(false)
    }
  }

  const loadGrants = async () => {
    if (!id) return
    try {
      const result = await api.getProjectGrants(parseInt(id))
      setGrants(result as ProjectGrant[])
      const totals = await api.getGrantTotals(parseInt(id))
      setGrantTotals(totals)
    } catch {
      // Silent fail
    }
  }

  // Grant predefined values
  const grantPresets: Record<string, { name: string; rate: number; vatExcluded: boolean }> = {
    tubitak: { name: 'TÜBİTAK', rate: 75, vatExcluded: true },
    kosgeb: { name: 'KOSGEB', rate: 80, vatExcluded: true },
    sponsor: { name: '', rate: 0, vatExcluded: false },
    other: { name: '', rate: 0, vatExcluded: false }
  }

  const handleGrantTypeChange = async (type: 'tubitak' | 'kosgeb' | 'sponsor' | 'other') => {
    const preset = grantPresets[type]
    setGrantFormData(prev => ({
      ...prev,
      provider_type: type,
      provider_name: preset.name,
      funding_rate: preset.rate > 0 ? preset.rate.toString() : '',
      vat_excluded: preset.vatExcluded,
      use_rate: type !== 'sponsor'
    }))

    // Calculate amount if we have a rate and project
    if (preset.rate > 0 && project) {
      try {
        const amount = await api.calculateGrantAmount(project.id, preset.rate, preset.vatExcluded)
        setCalculatedGrantAmount(amount)
        setGrantFormData(prev => ({
          ...prev,
          approved_amount: amount.toString()
        }))
      } catch {
        // Silent fail
      }
    } else {
      setCalculatedGrantAmount(0)
    }
  }

  const handleGrantRateChange = async (rate: string) => {
    setGrantFormData(prev => ({ ...prev, funding_rate: rate }))
    const rateNum = parseFloat(rate)
    if (rateNum > 0 && project) {
      try {
        const amount = await api.calculateGrantAmount(project.id, rateNum, grantFormData.vat_excluded)
        setCalculatedGrantAmount(amount)
        setGrantFormData(prev => ({
          ...prev,
          approved_amount: amount.toString()
        }))
      } catch {
        // Silent fail
      }
    } else {
      setCalculatedGrantAmount(0)
    }
  }

  const handleGrantVatChange = async (vatExcluded: boolean) => {
    setGrantFormData(prev => ({ ...prev, vat_excluded: vatExcluded }))
    const rate = parseFloat(grantFormData.funding_rate)
    if (rate > 0 && project) {
      try {
        const amount = await api.calculateGrantAmount(project.id, rate, vatExcluded)
        setCalculatedGrantAmount(amount)
        setGrantFormData(prev => ({
          ...prev,
          approved_amount: amount.toString()
        }))
      } catch {
        // Silent fail
      }
    }
  }

  const openCreateGrantForm = () => {
    setEditingGrant(null)
    setGrantFormData({
      provider_type: 'tubitak',
      provider_name: 'TÜBİTAK',
      funding_rate: '75',
      funding_amount: '',
      vat_excluded: true,
      approved_amount: '',
      received_amount: '0',
      currency: project?.currency as Currency || 'TRY',
      status: 'pending',
      notes: '',
      use_rate: true
    })
    setCalculatedGrantAmount(0)
    setShowGrantForm(true)
    // Auto-calculate for default TÜBİTAK
    if (project) {
      api.calculateGrantAmount(project.id, 75, true).then((amount: number) => {
        setCalculatedGrantAmount(amount)
        setGrantFormData(prev => ({
          ...prev,
          approved_amount: amount.toString()
        }))
      }).catch(() => {})
    }
  }

  const openEditGrantForm = (grant: ProjectGrant) => {
    setEditingGrant(grant)
    setGrantFormData({
      provider_type: grant.provider_type,
      provider_name: grant.provider_name,
      funding_rate: grant.funding_rate?.toString() || '',
      funding_amount: grant.funding_amount?.toString() || '',
      vat_excluded: grant.vat_excluded,
      approved_amount: grant.approved_amount.toString(),
      received_amount: grant.received_amount.toString(),
      currency: grant.currency,
      status: grant.status,
      notes: grant.notes || '',
      use_rate: grant.funding_rate !== null
    })
    setCalculatedGrantAmount(0)
    setShowGrantForm(true)
  }

  const closeGrantForm = () => {
    setShowGrantForm(false)
    setEditingGrant(null)
  }

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return

    const data = {
      project_id: project.id,
      provider_name: grantFormData.provider_name,
      provider_type: grantFormData.provider_type,
      funding_rate: grantFormData.use_rate && grantFormData.funding_rate ? parseFloat(grantFormData.funding_rate) : null,
      funding_amount: !grantFormData.use_rate && grantFormData.funding_amount ? parseFloat(grantFormData.funding_amount) : null,
      vat_excluded: grantFormData.vat_excluded,
      approved_amount: parseFloat(grantFormData.approved_amount) || 0,
      received_amount: parseFloat(grantFormData.received_amount) || 0,
      currency: grantFormData.currency,
      status: grantFormData.status,
      notes: grantFormData.notes || null
    }

    try {
      if (editingGrant) {
        const result = await api.updateGrant(editingGrant.id, data)
        if (result.success) {
          addAlert('success', result.message)
          loadGrants()
          closeGrantForm()
        } else {
          addAlert('error', result.message)
        }
      } else {
        const result = await api.createGrant(data)
        if (result.success) {
          addAlert('success', result.message)
          loadGrants()
          closeGrantForm()
        } else {
          addAlert('error', result.message)
        }
      }
    } catch {
      addAlert('error', t('common.error'))
    }
  }

  const handleDeleteGrant = async (grantId: number) => {
    const confirmed = await api.confirm(t('grants.confirmDelete'))
    if (!confirmed) return

    try {
      const result = await api.deleteGrant(grantId)
      if (result.success) {
        addAlert('success', result.message)
        loadGrants()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.deleteFailed'))
    }
  }

  const getGrantStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-green-100 text-green-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'partial': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
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
        const result = await api.updateMilestone(editingMilestone.id, data)
        if (result.success) {
          addAlert('success', result.message)
          loadProject()
          closeMilestoneForm()
        } else {
          addAlert('error', result.message)
        }
      } else {
        const result = await api.createMilestone(data)
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
    const confirmed = await api.confirm(t('projectDetail.confirmDeleteMilestone'))
    if (!confirmed) return

    try {
      const result = await api.deleteMilestone(milestoneId)
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

  // Transaction form handlers
  const openTransactionForm = (type: 'income' | 'expense') => {
    setTransactionType(type)
    setTransactionFormData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      currency: project?.currency as 'TRY' | 'USD' | 'EUR' || 'TRY',
      party_id: project?.party_id?.toString() || '',
      category_id: '',
      vat_rate: '0',
      withholding_rate: '0',
      description: ''
    })
    setShowTransactionForm(true)
  }

  const closeTransactionForm = () => {
    setShowTransactionForm(false)
  }

  const handleTransactionSubmit = async (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault()
    if (!project) return

    const data = {
      type: transactionType,
      project_id: project.id,
      party_id: transactionFormData.party_id ? parseInt(transactionFormData.party_id) : null,
      category_id: transactionFormData.category_id ? parseInt(transactionFormData.category_id) : null,
      date: transactionFormData.date,
      amount: parseFloat(transactionFormData.amount) || 0,
      currency: transactionFormData.currency,
      vat_rate: parseFloat(transactionFormData.vat_rate) || 0,
      withholding_rate: parseFloat(transactionFormData.withholding_rate) || 0,
      description: transactionFormData.description || null,
      created_by: user?.id
    }

    try {
      const result = await api.createTransaction(data)
      if (result.success) {
        addAlert('success', result.message)
        loadProject()
        loadTransactions()
        if (addAnother) {
          // Reset form but keep some fields
          setTransactionFormData(prev => ({
            ...prev,
            amount: '',
            description: ''
          }))
        } else {
          closeTransactionForm()
        }
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.error'))
    }
  }

  const handleDeleteTransaction = async (transactionId: number) => {
    const confirmed = await api.confirm(t('projectDetail.confirmDeleteTransaction'))
    if (!confirmed) return

    try {
      const result = await api.deleteTransaction(transactionId)
      if (result.success) {
        addAlert('success', result.message)
        loadProject()
        loadTransactions()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('common.deleteFailed'))
    }
  }

  const filteredCategories = categories.filter(c => c.type === transactionType && c.is_active)

  // Add existing transactions modal handlers
  const loadUnassignedTransactions = async () => {
    setUnassignedLoading(true)
    try {
      const filters: { type?: string; date_from?: string; date_to?: string } = {}

      if (unassignedFilters.type) {
        filters.type = unassignedFilters.type
      }

      if (unassignedFilters.dateRange !== 'all') {
        const days = parseInt(unassignedFilters.dateRange)
        const dateFrom = new Date()
        dateFrom.setDate(dateFrom.getDate() - days)
        filters.date_from = dateFrom.toISOString().split('T')[0]
      }

      const result = await api.getUnassignedTransactions(filters)
      setUnassignedTransactions(result as Transaction[])
    } catch {
      // Silent fail
    } finally {
      setUnassignedLoading(false)
    }
  }

  const openAddExistingModal = () => {
    setSelectedTransactionIds(new Set())
    setShowAddExistingModal(true)
    loadUnassignedTransactions()
  }

  const closeAddExistingModal = () => {
    setShowAddExistingModal(false)
    setSelectedTransactionIds(new Set())
    setUnassignedTransactions([])
  }

  const toggleTransactionSelection = (id: number) => {
    setSelectedTransactionIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedTransactionIds.size === unassignedTransactions.length) {
      setSelectedTransactionIds(new Set())
    } else {
      setSelectedTransactionIds(new Set(unassignedTransactions.map(t => t.id)))
    }
  }

  const handleAssignTransactions = async () => {
    if (!project || selectedTransactionIds.size === 0) return

    try {
      const result = await api.assignTransactionsToProject(
        Array.from(selectedTransactionIds),
        project.id
      )

      if (result.success) {
        addAlert('success', t('projectDetail.transactionsAssigned', { count: result.count }))
        loadProject()
        loadTransactions()
        closeAddExistingModal()
      } else {
        addAlert('error', result.message)
      }
    } catch {
      addAlert('error', t('projectDetail.assignFailed'))
    }
  }

  // Reload unassigned transactions when filters change
  const handleUnassignedFilterChange = (key: 'type' | 'dateRange', value: string) => {
    setUnassignedFilters(prev => ({ ...prev, [key]: value }))
  }

  // Effect to reload when filters change
  useEffect(() => {
    if (showAddExistingModal) {
      loadUnassignedTransactions()
    }
  }, [unassignedFilters])

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
          <p className="text-gray-500">{project.party_name || t('projects.internalProject')}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div>
            <p className="text-sm text-gray-500">{t('projectDetail.contractAmount')}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(project.contract_amount, project.currency as 'TRY' | 'USD' | 'EUR')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('projectDetail.collection')}</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(project.collected_amount || 0, project.currency as 'TRY' | 'USD' | 'EUR')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('grants.totalReceived')}</p>
            <p className="text-2xl font-bold text-purple-600">{formatCurrency(grantTotals.total_received, project.currency as 'TRY' | 'USD' | 'EUR')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('projectDetail.remaining')}</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency((project.remaining_amount || 0) - grantTotals.total_received, project.currency as 'TRY' | 'USD' | 'EUR')}</p>
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

      {/* Grants and Funding */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('grants.title')}</h3>
          <button onClick={openCreateGrantForm} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('grants.addGrant')}
          </button>
        </div>
        <div className="p-6">
          {grants.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('grants.providerName')}</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('grants.fundingRate')}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('grants.approvedAmount')}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('grants.receivedAmount')}</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.status')}</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {grants.map((grant) => (
                      <tr key={grant.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{grant.provider_name}</div>
                          <div className="text-xs text-gray-500">{t(`grants.types.${grant.provider_type}`)}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                          {grant.funding_rate ? `%${grant.funding_rate}` : t('grants.fixed')}
                          {grant.vat_excluded && grant.funding_rate && (
                            <span className="ml-1 text-xs text-gray-500">({t('grants.vatExcluded')})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          {formatCurrency(grant.approved_amount, grant.currency as 'TRY' | 'USD' | 'EUR')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-green-600">
                          {formatCurrency(grant.received_amount, grant.currency as 'TRY' | 'USD' | 'EUR')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getGrantStatusColor(grant.status)}`}>
                            {t(`grants.status.${grant.status}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {isAdmin && (
                            <div className="flex items-center justify-center space-x-2">
                              <button onClick={() => openEditGrantForm(grant)} className="text-blue-600 hover:text-blue-800">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button onClick={() => handleDeleteGrant(grant.id)} className="text-red-600 hover:text-red-800">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-6">
                <div className="text-sm">
                  <span className="text-gray-500">{t('grants.totalApproved')}: </span>
                  <span className="font-semibold text-gray-900">{formatCurrency(grantTotals.total_approved, project.currency as 'TRY' | 'USD' | 'EUR')}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">{t('grants.totalReceived')}: </span>
                  <span className="font-semibold text-green-600">{formatCurrency(grantTotals.total_received, project.currency as 'TRY' | 'USD' | 'EUR')}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 py-4">{t('grants.noGrants')}</p>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{t('projectDetail.transactions')}</h3>
          <div className="flex space-x-2">
            <button onClick={() => openTransactionForm('income')} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('projectDetail.addIncome')}
            </button>
            <button onClick={() => openTransactionForm('expense')} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('projectDetail.addExpense')}
            </button>
            <button onClick={openAddExistingModal} className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {t('projectDetail.addExistingTransactions')}
            </button>
          </div>
        </div>
        <div className="p-6">
          {transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.date')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.description')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.type')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.amount')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(tx.date)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{tx.description || tx.category_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          tx.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {tx.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                        </span>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium text-right ${
                        tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.net_amount, tx.currency as 'TRY' | 'USD' | 'EUR')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {isAdmin && (
                          <button onClick={() => handleDeleteTransaction(tx.id)} className="text-red-600 hover:text-red-800">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">{t('projectDetail.noTransactions')}</p>
          )}
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

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {transactionType === 'income' ? t('projectDetail.addIncome') : t('projectDetail.addExpense')}
              </h3>
              <button
                type="button"
                onClick={closeTransactionForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={(e) => handleTransactionSubmit(e, false)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.transactionForm.date')} *</label>
                  <input
                    type="date"
                    value={transactionFormData.date}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.transactionForm.category')}</label>
                  <select
                    value={transactionFormData.category_id}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">{t('common.select')}</option>
                    {filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.transactionForm.amount')} *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionFormData.amount}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.transactionForm.currency')}</label>
                  <select
                    value={transactionFormData.currency}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, currency: e.target.value as 'TRY' | 'USD' | 'EUR' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.transactionForm.party')}</label>
                <select
                  value={transactionFormData.party_id}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, party_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('common.select')}</option>
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>{party.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.transactionForm.vatRate')}</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={transactionFormData.vat_rate}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, vat_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.transactionForm.withholdingRate')}</label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={transactionFormData.withholding_rate}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, withholding_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled={transactionType === 'expense'}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('projectDetail.transactionForm.description')}</label>
                <textarea
                  value={transactionFormData.description}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeTransactionForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleTransactionSubmit(e as unknown as React.FormEvent, true)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  {t('projectDetail.saveAndAddNew')}
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white ${
                    transactionType === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Existing Transactions Modal */}
      {showAddExistingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{t('projectDetail.addExistingTransactions')}</h3>
              <button
                type="button"
                onClick={closeAddExistingModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filters */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('projectDetail.filterType')}</label>
                  <select
                    value={unassignedFilters.type}
                    onChange={(e) => handleUnassignedFilterChange('type', e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="">{t('common.all')}</option>
                    <option value="income">{t('transactions.income')}</option>
                    <option value="expense">{t('transactions.expense')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('projectDetail.filterDateRange')}</label>
                  <select
                    value={unassignedFilters.dateRange}
                    onChange={(e) => handleUnassignedFilterChange('dateRange', e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="30">{t('projectDetail.last30Days')}</option>
                    <option value="90">{t('projectDetail.last90Days')}</option>
                    <option value="all">{t('projectDetail.allTime')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Select All */}
            {unassignedTransactions.length > 0 && (
              <div className="px-6 py-2 border-b border-gray-200 flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTransactionIds.size === unassignedTransactions.length && unassignedTransactions.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {selectedTransactionIds.size === unassignedTransactions.length ? t('projectDetail.deselectAll') : t('projectDetail.selectAll')}
                  </span>
                </label>
                {selectedTransactionIds.size > 0 && (
                  <span className="text-sm text-blue-600 font-medium">
                    {t('projectDetail.selectedCount', { count: selectedTransactionIds.size })}
                  </span>
                )}
              </div>
            )}

            {/* Transaction List */}
            <div className="flex-1 overflow-auto p-6">
              {unassignedLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : unassignedTransactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-10 px-3 py-3"></th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.date')}</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.description')}</th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.type')}</th>
                        <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.amount')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {unassignedTransactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className={`hover:bg-gray-50 cursor-pointer ${selectedTransactionIds.has(tx.id) ? 'bg-blue-50' : ''}`}
                          onClick={() => toggleTransactionSelection(tx.id)}
                        >
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedTransactionIds.has(tx.id)}
                              onChange={() => toggleTransactionSelection(tx.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(tx.date)}</td>
                          <td className="px-3 py-3 text-sm text-gray-500 max-w-xs truncate">{tx.description || tx.category_name || '-'}</td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              tx.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {tx.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                            </span>
                          </td>
                          <td className={`px-3 py-3 whitespace-nowrap text-sm font-medium text-right ${
                            tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.net_amount, tx.currency as 'TRY' | 'USD' | 'EUR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">{t('projectDetail.noUnassignedTransactions')}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={closeAddExistingModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleAssignTransactions}
                disabled={selectedTransactionIds.size === 0}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {t('projectDetail.addSelectedToProject')} ({selectedTransactionIds.size})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grant Form Modal */}
      {showGrantForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingGrant ? t('grants.editGrant') : t('grants.addGrant')}
              </h3>
              <button
                type="button"
                onClick={closeGrantForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleGrantSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('grants.providerType')}</label>
                <select
                  value={grantFormData.provider_type}
                  onChange={(e) => handleGrantTypeChange(e.target.value as 'tubitak' | 'kosgeb' | 'sponsor' | 'other')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="tubitak">{t('grants.types.tubitak')}</option>
                  <option value="kosgeb">{t('grants.types.kosgeb')}</option>
                  <option value="sponsor">{t('grants.types.sponsor')}</option>
                  <option value="other">{t('grants.types.other')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('grants.providerName')} *</label>
                <input
                  type="text"
                  value={grantFormData.provider_name}
                  onChange={(e) => setGrantFormData({ ...grantFormData, provider_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              {/* Rate Type Selection */}
              <div className="flex items-center space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="rateType"
                    checked={grantFormData.use_rate}
                    onChange={() => setGrantFormData({ ...grantFormData, use_rate: true })}
                    className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('grants.rateType.percentage')}</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="rateType"
                    checked={!grantFormData.use_rate}
                    onChange={() => setGrantFormData({ ...grantFormData, use_rate: false })}
                    className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{t('grants.rateType.fixed')}</span>
                </label>
              </div>

              {grantFormData.use_rate ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('grants.fundingRate')}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={grantFormData.funding_rate}
                      onChange={(e) => handleGrantRateChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={grantFormData.vat_excluded}
                        onChange={(e) => handleGrantVatChange(e.target.checked)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{t('grants.vatExcluded')}</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('grants.fundingAmount')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={grantFormData.funding_amount}
                    onChange={(e) => setGrantFormData({ ...grantFormData, funding_amount: e.target.value, approved_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}

              {/* Calculated Amount */}
              {grantFormData.use_rate && calculatedGrantAmount > 0 && (
                <div className="bg-purple-50 p-3 rounded-md">
                  <p className="text-sm text-purple-700">
                    <span className="font-medium">{t('grants.calculatedAmount')}: </span>
                    {formatCurrency(calculatedGrantAmount, project?.currency as 'TRY' | 'USD' | 'EUR' || 'TRY')}
                    <span className="text-xs ml-2">
                      ({formatCurrency(project?.contract_amount || 0, project?.currency as 'TRY' | 'USD' | 'EUR' || 'TRY')} x %{grantFormData.funding_rate}
                      {grantFormData.vat_excluded && ' - KDV'})
                    </span>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('grants.approvedAmount')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={grantFormData.approved_amount}
                    onChange={(e) => setGrantFormData({ ...grantFormData, approved_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('grants.receivedAmount')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={grantFormData.received_amount}
                    onChange={(e) => setGrantFormData({ ...grantFormData, received_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.currency')}</label>
                  <select
                    value={grantFormData.currency}
                    onChange={(e) => setGrantFormData({ ...grantFormData, currency: e.target.value as Currency })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.status')}</label>
                  <select
                    value={grantFormData.status}
                    onChange={(e) => setGrantFormData({ ...grantFormData, status: e.target.value as 'pending' | 'approved' | 'partial' | 'received' | 'rejected' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="pending">{t('grants.status.pending')}</option>
                    <option value="approved">{t('grants.status.approved')}</option>
                    <option value="partial">{t('grants.status.partial')}</option>
                    <option value="received">{t('grants.status.received')}</option>
                    <option value="rejected">{t('grants.status.rejected')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.notes')}</label>
                <textarea
                  value={grantFormData.notes}
                  onChange={(e) => setGrantFormData({ ...grantFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeGrantForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-purple-600 hover:bg-purple-700"
                >
                  {editingGrant ? t('common.update') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
