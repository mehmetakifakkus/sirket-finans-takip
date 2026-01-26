import { useEffect, useState, useMemo } from 'react'
import { api } from '@/api'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../utils/currency'
import { formatDate, getToday } from '../utils/date'
import { DocumentUpload } from '../components/DocumentUpload'
import { SearchableSelect } from '../components/SearchableSelect'
import { DateRangePicker } from '../components/DateRangePicker'
import * as pdfjsLib from 'pdfjs-dist'
import type { Transaction, Party, Category, Project, ImportRow, ImportPreview, TransactionDocument } from '../types'

// Set up PDF.js worker using CDN (works in Electron with nodeIntegration)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

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
  const [showImportModal, setShowImportModal] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [partyApprovals, setPartyApprovals] = useState<Record<string, boolean>>({})
  const [partyMerges, setPartyMerges] = useState<Record<string, string>>({})
  const [showDocumentPreview, setShowDocumentPreview] = useState(false)
  const [previewDocuments, setPreviewDocuments] = useState<TransactionDocument[]>([])
  const [documentPreviews, setDocumentPreviews] = useState<Record<number, string>>({})
  const [loadingPreviews, setLoadingPreviews] = useState(false)
  const [loadingDocIds, setLoadingDocIds] = useState<Record<number, boolean>>({})
  const { addAlert } = useAppStore()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  const [filters, setFilters] = useState({
    type: searchParams.get('type') || '',
    party_id: '',
    category_id: '',
    project_id: '',
    date_from: '',
    date_to: ''
  })

  const [sortField, setSortField] = useState<'date' | 'amount' | 'net_amount' | 'category_name' | 'party_name'>('date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Priority: close mini modals first, then main modal
        if (showCategoryForm) {
          setShowCategoryForm(false)
        } else if (showPartyForm) {
          setShowPartyForm(false)
        } else if (showProjectForm) {
          setShowProjectForm(false)
        } else if (showDocumentPreview) {
          setShowDocumentPreview(false)
        } else if (showImportModal) {
          setShowImportModal(false)
        } else if (showForm) {
          closeForm()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [showForm, showCategoryForm, showPartyForm, showProjectForm, showDocumentPreview, showImportModal])

  const loadData = async () => {
    try {
      const [partiesRes, categoriesRes, projectsRes] = await Promise.all([
        api.getParties(),
        api.getCategories(),
        api.getProjects()
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

      const result = await api.getTransactions(filterParams)
      setTransactions(result as Transaction[])
    } catch {
      addAlert('error', t('common.dataNotLoaded'))
    } finally {
      setLoading(false)
    }
  }

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const aRaw = a[sortField]
      const bRaw = b[sortField]

      // null/undefined handling
      const aVal = aRaw ?? ''
      const bVal = bRaw ?? ''

      // string comparison for text fields
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal, 'tr')
          : bVal.localeCompare(aVal, 'tr')
      }

      // numeric comparison
      const aNum = Number(aVal)
      const bNum = Number(bVal)
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum
    })
  }, [transactions, sortField, sortDirection])

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (field !== sortField) {
      return (
        <svg className="w-3 h-3 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5-5 5 5H7zM7 14l5 5 5-5H7z" />
        </svg>
      )
    }
    return sortDirection === 'asc' ? (
      <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 14l5-5 5 5H7z" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 10l5 5 5-5H7z" />
      </svg>
    )
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
        const result = await api.updateTransaction(editingTransaction.id, data)
        if (result.success) {
          addAlert('success', result.message)
          loadTransactions()
          closeForm()
        } else {
          addAlert('error', result.message)
        }
      } else {
        const result = await api.createTransaction(data)
        if (result.success) {
          addAlert('success', result.message)
          loadTransactions()
          // Open edit mode for the newly created transaction so user can add documents
          if (result.id) {
            const newTransaction = await api.getTransaction(result.id)
            if (newTransaction) {
              setEditingTransaction(newTransaction as Transaction)
            }
          } else {
            closeForm()
          }
        } else {
          addAlert('error', result.message)
        }
      }
    } catch {
      addAlert('error', t('common.error'))
    }
  }

  const handleDelete = async (id: number) => {
    const confirmed = await api.confirm(t('common.confirmDelete'))
    if (!confirmed) return

    try {
      const result = await api.deleteTransaction(id)
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

  const generatePdfThumbnail = async (base64Data: string): Promise<string | null> => {
    try {
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const loadingTask = pdfjsLib.getDocument({ data: bytes })
      const pdf = await loadingTask.promise
      const page = await pdf.getPage(1)

      const scale = 1.5
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      if (!context) return null

      canvas.width = viewport.width
      canvas.height = viewport.height

      const renderTask = page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas
      } as Parameters<typeof page.render>[0])

      await renderTask.promise
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.error('Error generating PDF thumbnail:', error)
      return null
    }
  }

  const openDocumentPreview = async (transactionId: number) => {
    const MIN_LOADING_TIME = 800 // minimum loading animation time in ms

    setShowDocumentPreview(true)
    setPreviewDocuments([])
    setDocumentPreviews({})
    setLoadingDocIds({})

    try {
      const docs = await api.getDocuments(transactionId)
      const typedDocs = docs as TransactionDocument[]

      // Mark all previewable docs as loading immediately
      const loadingMap: Record<number, boolean> = {}
      typedDocs.forEach(doc => {
        if (doc.mime_type.startsWith('image/') || doc.mime_type === 'application/pdf') {
          loadingMap[doc.id] = true
        }
      })

      setPreviewDocuments(typedDocs)
      setLoadingDocIds(loadingMap)
      setLoadingPreviews(false)

      // Load previews for images and PDFs progressively
      for (const doc of typedDocs) {
        const startTime = Date.now()

        if (doc.mime_type.startsWith('image/')) {
          const result = await api.getDocumentPreview(doc.id)
          if (result.success && result.data) {
            // Ensure minimum loading time
            const elapsed = Date.now() - startTime
            if (elapsed < MIN_LOADING_TIME) {
              await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed))
            }
            setDocumentPreviews(prev => ({ ...prev, [doc.id]: `data:${result.mimeType};base64,${result.data}` }))
          }
          setLoadingDocIds(prev => { const next = { ...prev }; delete next[doc.id]; return next })
        } else if (doc.mime_type === 'application/pdf') {
          const result = await api.getDocumentPreview(doc.id)
          if (result.success && result.data) {
            const pdfThumbnail = await generatePdfThumbnail(result.data)
            // Ensure minimum loading time
            const elapsed = Date.now() - startTime
            if (elapsed < MIN_LOADING_TIME) {
              await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed))
            }
            if (pdfThumbnail) {
              setDocumentPreviews(prev => ({ ...prev, [doc.id]: pdfThumbnail }))
            }
          }
          setLoadingDocIds(prev => { const next = { ...prev }; delete next[doc.id]; return next })
        }
      }
    } catch (error) {
      console.error('Error loading document previews:', error)
      addAlert('error', t('transactions.documents.loadFailed'))
      setLoadingPreviews(false)
    }
  }

  const handleOpenDocument = async (doc: TransactionDocument) => {
    try {
      await api.openDocument(doc.filename)
    } catch {
      addAlert('error', t('transactions.documents.openFailed'))
    }
  }

  const handleExport = async () => {
    try {
      const result = await api.exportTransactions(filters)
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
      const result = await api.createCategory({
        name: newCategoryName.trim(),
        type: formData.type,
        parent_id: null,
        is_active: true
      })

      if (result.success) {
        addAlert('success', t('categories.categoryCreated'))
        const categoriesRes = await api.getCategories()
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
      const result = await api.createParty({
        type: newPartyData.type,
        name: newPartyData.name.trim(),
        tax_no: null, phone: null, email: null, address: null, notes: null
      })
      if (result.success) {
        addAlert('success', t('parties.partyCreated'))
        const partiesRes = await api.getParties()
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
      const result = await api.createProject({
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
        const projectsRes = await api.getProjects()
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

  const handleImportClick = async () => {
    try {
      const result = await api.selectImportFile()
      if (!result.success || !result.filePath) {
        return
      }

      const parseResult = await api.parseImportFile(result.filePath)
      if (!parseResult.success || !parseResult.preview) {
        addAlert('error', parseResult.message || t('transactions.import.failed'))
        return
      }

      setImportPreview(parseResult.preview as ImportPreview)
      setImportRows(parseResult.preview.rows as ImportRow[])

      // Initialize party approvals - all new parties are approved by default
      const newParties = (parseResult.preview.parties as { name: string; exists: boolean }[])
        .filter(p => !p.exists)
      const initialApprovals: Record<string, boolean> = {}
      newParties.forEach(p => {
        initialApprovals[p.name] = true // approved by default
      })
      setPartyApprovals(initialApprovals)

      setShowImportModal(true)
    } catch {
      addAlert('error', t('transactions.import.fileSelectFailed'))
    }
  }

  const handleImportRowToggle = (rowNumber: number) => {
    setImportRows(rows =>
      rows.map(r => r.rowNumber === rowNumber ? { ...r, selected: !r.selected } : r)
    )
  }

  const handleImportSelectAll = () => {
    setImportRows(rows => rows.map(r => r.isValid ? { ...r, selected: true } : r))
  }

  const handleImportDeselectAll = () => {
    setImportRows(rows => rows.map(r => ({ ...r, selected: false })))
  }

  const handleImportExecute = async () => {
    // Filter out rows with rejected parties
    const selectedRows = importRows.filter(r => {
      if (!r.selected || !r.isValid) return false
      // If row has a new party, check if it's approved
      if (r.isNewParty && partyApprovals[r.location] === false) return false
      return true
    })
    if (selectedRows.length === 0) {
      addAlert('error', t('transactions.import.noRowsSelected'))
      return
    }

    setIsImporting(true)
    try {
      const result = await api.executeImport(selectedRows, user?.id || 0)
      if (result.success) {
        if (result.categoriesCreated > 0 || result.partiesCreated > 0) {
          addAlert('success', t('transactions.import.successWithNew', {
            count: result.imported,
            categories: result.categoriesCreated,
            parties: result.partiesCreated
          }))
        } else {
          addAlert('success', t('transactions.import.success', { count: result.imported }))
        }
        setShowImportModal(false)
        setImportPreview(null)
        setImportRows([])
        loadTransactions()
        loadData()
      } else {
        if (result.imported > 0) {
          addAlert('warning', t('transactions.import.partialSuccess', {
            imported: result.imported,
            failed: result.failed
          }))
        } else {
          addAlert('error', result.message || t('transactions.import.failed'))
        }
      }
    } catch {
      addAlert('error', t('transactions.import.failed'))
    } finally {
      setIsImporting(false)
    }
  }

  const closeImportModal = () => {
    setShowImportModal(false)
    setImportPreview(null)
    setImportRows([])
    setPartyApprovals({})
    setPartyMerges({})
  }

  // Normalize vendor name for similarity comparison
  const normalizeVendorName = (name: string): string => {
    return name.toLowerCase()
      .replace(/[^a-z0-9öüşığçıëäü]/g, '')
  }

  // Find similar parties from both existing DB parties and other new parties in import
  const findSimilarParties = (name: string, newPartyNames: string[]): { existing: string[]; newOnes: string[] } => {
    const normalized = normalizeVendorName(name)
    if (normalized.length < 3) return { existing: [], newOnes: [] }

    const existing = parties
      .map(p => p.name)
      .filter(p => {
        const pNormalized = normalizeVendorName(p)
        if (pNormalized.length < 3) return false
        return (pNormalized.includes(normalized) || normalized.includes(pNormalized)) && pNormalized !== normalized
      })

    const newOnes = newPartyNames.filter(p => {
      if (p === name) return false
      const pNormalized = normalizeVendorName(p)
      if (pNormalized.length < 3) return false
      return (pNormalized.includes(normalized) || normalized.includes(pNormalized)) && pNormalized !== normalized
    })

    return { existing, newOnes }
  }

  // Handle merge selection
  const handleMergeParty = (sourceName: string, targetName: string) => {
    if (!targetName) {
      // Clear merge
      setPartyMerges(prev => {
        const newMerges = { ...prev }
        delete newMerges[sourceName]
        return newMerges
      })
      return
    }

    setPartyMerges(prev => ({
      ...prev,
      [sourceName]: targetName
    }))

    // Update import rows to use the target party name
    setImportRows(rows =>
      rows.map(r => {
        if (r.location === sourceName) {
          // Check if target is an existing party
          const existingParty = parties.find(p => p.name === targetName)
          return {
            ...r,
            location: targetName,
            isNewParty: !existingParty,
            originalLocation: r.originalLocation || sourceName
          }
        }
        return r
      })
    )

    // Remove source from approvals if merging to existing party
    const existingParty = parties.find(p => p.name === targetName)
    if (existingParty) {
      setPartyApprovals(prev => {
        const newApprovals = { ...prev }
        delete newApprovals[sourceName]
        return newApprovals
      })
    }
  }

  // Undo merge
  const handleUndoMerge = (sourceName: string) => {
    const originalName = Object.entries(partyMerges).find(([_, target]) => target === sourceName)?.[0]
    if (!originalName) return

    setPartyMerges(prev => {
      const newMerges = { ...prev }
      delete newMerges[originalName]
      return newMerges
    })

    // Restore original location in import rows
    setImportRows(rows =>
      rows.map(r => {
        if (r.originalLocation === originalName) {
          return {
            ...r,
            location: originalName,
            isNewParty: true,
            originalLocation: undefined
          }
        }
        return r
      })
    )

    // Re-add to approvals
    setPartyApprovals(prev => ({
      ...prev,
      [originalName]: true
    }))
  }

  const handlePartyApprovalToggle = (partyName: string) => {
    setPartyApprovals(prev => {
      const newApprovals = { ...prev, [partyName]: !prev[partyName] }
      // When a party is rejected, deselect rows that use that party
      if (!newApprovals[partyName]) {
        setImportRows(rows =>
          rows.map(r => r.isNewParty && r.location === partyName ? { ...r, selected: false } : r)
        )
      }
      return newApprovals
    })
  }

  const handleApproveAllParties = () => {
    setPartyApprovals(prev => {
      const newApprovals: Record<string, boolean> = {}
      Object.keys(prev).forEach(name => {
        newApprovals[name] = true
      })
      return newApprovals
    })
  }

  const handleRejectAllParties = () => {
    setPartyApprovals(prev => {
      const newApprovals: Record<string, boolean> = {}
      Object.keys(prev).forEach(name => {
        newApprovals[name] = false
      })
      // Deselect all rows with new parties
      setImportRows(rows =>
        rows.map(r => r.isNewParty ? { ...r, selected: false } : r)
      )
      return newApprovals
    })
  }

  // Check if a row should be disabled due to rejected party
  const isRowDisabledByRejectedParty = (row: ImportRow): boolean => {
    if (!row.isNewParty) return false
    return partyApprovals[row.location] === false
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
            onClick={handleImportClick}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m4-8l-4-4m0 0l-4 4m4-4v12" />
            </svg>
            {t('transactions.import.title')}
          </button>
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
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('transactions.party')}</label>
            <SearchableSelect
              options={parties.map(p => ({ value: p.id.toString(), label: p.name }))}
              value={filters.party_id}
              onChange={(value) => setFilters({ ...filters, party_id: value })}
              placeholder={t('transactions.searchParty')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('transactions.category')}</label>
            <SearchableSelect
              options={categories.filter(c => c.is_active).map(c => ({ value: c.id.toString(), label: c.name }))}
              value={filters.category_id}
              onChange={(value) => setFilters({ ...filters, category_id: value })}
              placeholder={t('transactions.searchCategory')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('transactions.project')}</label>
            <SearchableSelect
              options={projects.map(p => ({ value: p.id.toString(), label: p.title }))}
              value={filters.project_id}
              onChange={(value) => setFilters({ ...filters, project_id: value })}
              placeholder={t('transactions.searchProject')}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('dateRange.label')}</label>
            <DateRangePicker
              dateFrom={filters.date_from}
              dateTo={filters.date_to}
              onChange={(from, to) => setFilters({ ...filters, date_from: from, date_to: to })}
            />
          </div>
        </div>
      </div>

      {/* Active Filters Banner */}
      {(filters.type || filters.party_id || filters.category_id || filters.project_id || filters.date_from || filters.date_to) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-blue-700">
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                {t('transactions.activeFilters')}:
              </span>

              {filters.type && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-blue-300 rounded-full text-sm text-blue-800">
                  {filters.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                  <button
                    onClick={() => setFilters({ ...filters, type: '' })}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}

              {filters.party_id && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-blue-300 rounded-full text-sm text-blue-800">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {parties.find(p => p.id.toString() === filters.party_id)?.name}
                  <button
                    onClick={() => setFilters({ ...filters, party_id: '' })}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}

              {filters.category_id && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-blue-300 rounded-full text-sm text-blue-800">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {categories.find(c => c.id.toString() === filters.category_id)?.name}
                  <button
                    onClick={() => setFilters({ ...filters, category_id: '' })}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}

              {filters.project_id && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-blue-300 rounded-full text-sm text-blue-800">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {projects.find(p => p.id.toString() === filters.project_id)?.title}
                  <button
                    onClick={() => setFilters({ ...filters, project_id: '' })}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}

              {(filters.date_from || filters.date_to) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-blue-300 rounded-full text-sm text-blue-800">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {filters.date_from && formatDate(filters.date_from)}
                  {filters.date_from && filters.date_to && ' - '}
                  {filters.date_to && formatDate(filters.date_to)}
                  <button
                    onClick={() => setFilters({ ...filters, date_from: '', date_to: '' })}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )}
            </div>

            <button
              onClick={() => setFilters({ type: '', party_id: '', category_id: '', project_id: '', date_from: '', date_to: '' })}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('transactions.clearFilters')}
            </button>
          </div>
        </div>
      )}

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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('date')}
                >
                  <span className="flex items-center gap-1">
                    {t('common.date')}
                    <SortIcon field="date" />
                  </span>
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.type')}</th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('category_name')}
                >
                  <span className="flex items-center gap-1">
                    {t('transactions.category')}
                    <SortIcon field="category_name" />
                  </span>
                </th>
                <th
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('party_name')}
                >
                  <span className="flex items-center gap-1">
                    {t('transactions.party')}
                    <SortIcon field="party_name" />
                  </span>
                </th>
                <th
                  className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('amount')}
                >
                  <span className="flex items-center justify-end gap-1">
                    {t('common.amount')}
                    <SortIcon field="amount" />
                  </span>
                </th>
                <th
                  className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort('net_amount')}
                >
                  <span className="flex items-center justify-end gap-1">
                    {t('transactions.netAmount')}
                    <SortIcon field="net_amount" />
                  </span>
                </th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('transactions.documents.title')}</th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    {t('transactions.noTransactions')}
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((tr) => (
                  <tr key={tr.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-900">{formatDate(tr.date)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        tr.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {tr.type === 'income' ? t('transactions.income') : t('transactions.expense')}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{tr.category_name || '-'}</td>
                    <td className="px-3 py-3 text-sm max-w-[120px]">
                      {tr.party_id ? (
                        <button
                          onClick={() => setFilters({ ...filters, party_id: tr.party_id!.toString() })}
                          className="text-blue-600 hover:text-blue-800 hover:underline truncate block"
                          title={tr.party_name}
                        >
                          {tr.party_name}
                        </button>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right">{formatCurrency(tr.amount, tr.currency as 'TRY' | 'USD' | 'EUR')}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-right font-medium">{formatCurrency(tr.net_amount, tr.currency as 'TRY' | 'USD' | 'EUR')}</td>
                    <td className="px-2 py-3 whitespace-nowrap text-sm text-center">
                      {tr.document_count && tr.document_count > 0 ? (
                        <button
                          onClick={() => openDocumentPreview(tr.id)}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                          title={t('transactions.documents.viewDocuments')}
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          {tr.document_count}
                        </button>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap text-right text-sm">
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditForm(tr)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                            title={t('common.edit')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(tr.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                            title={t('common.delete')}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {transactions.length > 0 && (
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-sm font-semibold text-gray-700 text-right">
                    {t('common.total')} ({transactions.length} {t('transactions.transaction')}):
                  </td>
                  <td className="px-3 py-3 text-sm text-right">
                    <span className="text-green-600 font-medium">{formatCurrency(totals.income, 'TRY')}</span>
                    {' / '}
                    <span className="text-red-600 font-medium">{formatCurrency(totals.expense, 'TRY')}</span>
                  </td>
                  <td className="px-3 py-3 text-sm text-right font-bold text-gray-900">
                    {formatCurrency(totals.income - totals.expense, 'TRY')}
                  </td>
                  <td className="px-2"></td>
                  <td className="px-2"></td>
                </tr>
              </tfoot>
            )}
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
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {/* Row 1: Tarih + Para Birimi (50/50) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">{t('common.date')} *</label>
                  <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">{t('common.currency')}</label>
                  <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value as 'TRY' | 'USD' | 'EUR' })} className="w-full px-3 py-1.5 border border-gray-300 rounded-md">
                    <option value="TRY">TRY</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Tutar + KDV (2/3 + 1/3) */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">{t('common.amount')} *</label>
                  <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">{t('transactions.vatRate')}</label>
                  <input type="number" step="0.01" value={formData.vat_rate} onChange={(e) => setFormData({ ...formData, vat_rate: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-md" />
                </div>
              </div>

              {/* Row 3: Stopaj + Belge No (50/50) for income, Belge No (full) for expense */}
              {formData.type === 'income' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-0.5">{t('transactions.withholdingRate')}</label>
                    <input type="number" step="0.01" value={formData.withholding_rate} onChange={(e) => setFormData({ ...formData, withholding_rate: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-0.5">{t('transactions.refNo')}</label>
                    <input type="text" value={formData.ref_no} onChange={(e) => setFormData({ ...formData, ref_no: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-md" />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">{t('transactions.refNo')}</label>
                  <input type="text" value={formData.ref_no} onChange={(e) => setFormData({ ...formData, ref_no: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-md" />
                </div>
              )}

              {/* Row 4: Kategori + Taraf (50/50) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">{t('transactions.category')}</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setShowCategoryForm(true)
                      } else {
                        setFormData({ ...formData, category_id: e.target.value })
                      }
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                  >
                    <option value="">{t('common.select')}</option>
                    {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="new">+ {t('transactions.addNewCategory')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">{t('transactions.party')}</label>
                  <select
                    value={formData.party_id}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setShowPartyForm(true)
                      } else {
                        setFormData({ ...formData, party_id: e.target.value })
                      }
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                  >
                    <option value="">{t('common.select')}</option>
                    {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    <option value="new">+ {t('transactions.addNewParty')}</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Proje (full) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">{t('transactions.project')}</label>
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
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                >
                  <option value="">{t('common.select')}</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  <option value="new">+ {t('transactions.addNewProject')}</option>
                </select>
              </div>

              {/* Row 6: Açıklama (1 satır) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0.5">{t('common.description')}</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded-md" />
              </div>

              {/* Row 7: Dökümanlar */}
              <div className="pt-1">
                <DocumentUpload transactionId={editingTransaction?.id || null} />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={closeForm} className="px-4 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">{t('common.cancel')}</button>
                <button type="submit" className="px-4 py-1.5 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">{editingTransaction ? t('common.update') : t('common.save')}</button>
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

      {/* Import Modal */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">{t('transactions.import.title')}</h3>
              <button
                type="button"
                onClick={closeImportModal}
                className="text-gray-400 hover:text-gray-600"
                disabled={isImporting}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Summary */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <div className="flex flex-wrap gap-4 text-sm">
                <span><strong>{t('transactions.import.fileName')}:</strong> {importPreview.fileName}</span>
                <span><strong>{t('transactions.import.totalRows')}:</strong> {importPreview.totalRows}</span>
                <span className="text-green-600"><strong>{t('transactions.import.validRows')}:</strong> {importPreview.validRows}</span>
                <span className="text-red-600"><strong>{t('transactions.import.invalidRows')}:</strong> {importPreview.invalidRows}</span>
                <span className="text-gray-500"><strong>{t('transactions.import.skippedRows')}:</strong> {importPreview.skippedRows}</span>
              </div>

              {/* New categories badges */}
              {importPreview.categories.filter(c => !c.exists).length > 0 && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-purple-700">{t('transactions.import.categoriesWillCreate')}:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {importPreview.categories.filter(c => !c.exists).map(c => (
                      <span key={c.name} className="inline-flex px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded-full">{c.name}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* New parties approval panel */}
              {Object.keys(partyApprovals).length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-blue-800">
                        {t('transactions.import.newPartiesApproval')} ({Object.keys(partyApprovals).length})
                      </h4>
                      <p className="text-xs text-blue-600">{t('transactions.import.newPartiesApprovalDesc')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleApproveAllParties}
                        className="px-2 py-1 text-xs border border-green-300 text-green-700 rounded hover:bg-green-100"
                        disabled={isImporting}
                      >
                        {t('transactions.import.approveAll')}
                      </button>
                      <button
                        type="button"
                        onClick={handleRejectAllParties}
                        className="px-2 py-1 text-xs border border-red-300 text-red-700 rounded hover:bg-red-100"
                        disabled={isImporting}
                      >
                        {t('transactions.import.rejectAll')}
                      </button>
                    </div>
                  </div>

                  {/* Scrollable list */}
                  <div className="max-h-48 overflow-y-auto border border-blue-100 rounded-lg bg-white">
                    {Object.entries(partyApprovals)
                      .sort(([a], [b]) => a.localeCompare(b, 'tr'))
                      .map(([name, approved]) => {
                        const newPartyNames = Object.keys(partyApprovals)
                        const similarParties = findSimilarParties(name, newPartyNames)
                        const hasSimilar = similarParties.existing.length > 0 || similarParties.newOnes.length > 0
                        const isMerged = Object.values(partyMerges).includes(name)

                        return (
                          <div key={name} className="border-b border-gray-100 last:border-0 p-3">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={approved}
                                  onChange={() => handlePartyApprovalToggle(name)}
                                  disabled={isImporting}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="ml-2 font-medium text-gray-900">{name}</span>
                              </label>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                approved
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {approved ? t('transactions.import.approved') : t('transactions.import.rejected')}
                              </span>
                            </div>

                            {/* Similar parties merge option */}
                            {hasSimilar && approved && !isMerged && (
                              <div className="mt-2 ml-6 flex items-center gap-2 text-sm">
                                <span className="text-amber-600">
                                  <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  {t('transactions.import.similarVendors')}:
                                </span>
                                <select
                                  onChange={(e) => handleMergeParty(name, e.target.value)}
                                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                                  disabled={isImporting}
                                  defaultValue=""
                                >
                                  <option value="">{t('transactions.import.mergeWith')}...</option>
                                  {similarParties.existing.length > 0 && (
                                    <optgroup label={t('transactions.import.existingParty')}>
                                      {similarParties.existing.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                      ))}
                                    </optgroup>
                                  )}
                                  {similarParties.newOnes.length > 0 && (
                                    <optgroup label={t('transactions.import.newParty')}>
                                      {similarParties.newOnes.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                      ))}
                                    </optgroup>
                                  )}
                                </select>
                              </div>
                            )}

                            {/* Show merged indicator */}
                            {isMerged && (
                              <div className="mt-2 ml-6 flex items-center gap-2 text-sm text-purple-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                <span>
                                  {t('transactions.import.mergedTo', {
                                    source: Object.entries(partyMerges).find(([_, target]) => target === name)?.[0] || '',
                                    target: name
                                  })}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUndoMerge(name)}
                                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                                  disabled={isImporting}
                                >
                                  {t('common.cancel')}
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                  </div>

                  {Object.values(partyApprovals).some(v => !v) && (
                    <p className="mt-2 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                      {t('transactions.import.rowsDisabledByRejectedParty')}
                    </p>
                  )}
                </div>
              )}

              {/* Select/Deselect buttons */}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleImportSelectAll}
                  className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-100"
                  disabled={isImporting}
                >
                  {t('transactions.import.selectAll')}
                </button>
                <button
                  type="button"
                  onClick={handleImportDeselectAll}
                  className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-100"
                  disabled={isImporting}
                >
                  {t('transactions.import.deselectAll')}
                </button>
                <span className="ml-2 text-sm text-gray-600">
                  {importRows.filter(r => r.selected).length} / {importRows.filter(r => r.isValid).length} {t('common.select').toLowerCase()}
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12"></th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-12">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.import.expenseType')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.import.date')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.import.location')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.import.itemType')}</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('transactions.import.quantity')}</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('transactions.import.unitPrice')}</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('transactions.import.total')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {importRows.map((row) => {
                    const disabledByRejectedParty = isRowDisabledByRejectedParty(row)
                    return (
                    <tr
                      key={row.rowNumber}
                      className={`${!row.isValid ? 'bg-red-50' : disabledByRejectedParty ? 'bg-gray-100 opacity-60' : row.selected ? 'bg-blue-50' : ''} hover:bg-gray-50`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => handleImportRowToggle(row.rowNumber)}
                          disabled={!row.isValid || isImporting || disabledByRejectedParty}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">{row.rowNumber}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className={row.isNewCategory ? 'text-purple-700 font-medium' : ''}>{row.expenseType}</span>
                        {row.isNewCategory && (
                          <span className="ml-1 inline-flex px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">{t('common.add')}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">{row.date}</td>
                      <td className="px-3 py-2 text-sm">
                        <span className={row.isNewParty ? 'text-blue-700 font-medium' : ''}>{row.location}</span>
                        {row.isNewParty && (
                          <span className="ml-1 inline-flex px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">{t('common.add')}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-900">{row.itemType}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-right">{row.quantity ?? '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-right">{row.unitPrice ?? '-'}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-right font-medium">{formatCurrency(row.total, 'TRY')}</td>
                      <td className="px-3 py-2 text-sm">
                        {row.isValid ? (
                          <span className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">{t('transactions.import.validRows')}</span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full" title={row.errors.join(', ')}>
                            {row.errors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  )})}

                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
              <button
                type="button"
                onClick={closeImportModal}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={isImporting}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleImportExecute}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                disabled={isImporting || importRows.filter(r => r.selected).length === 0}
              >
                {isImporting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('transactions.import.importing')}
                  </span>
                ) : (
                  <>
                    {t('transactions.import.execute')} ({importRows.filter(r => r.selected).length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showDocumentPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">{t('transactions.documents.title')}</h3>
              <button
                type="button"
                onClick={() => setShowDocumentPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingPreviews ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : previewDocuments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{t('transactions.documents.noDocuments')}</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {previewDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleOpenDocument(doc)}
                      className="group relative bg-gray-50 rounded-lg border border-gray-200 p-3 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer text-left"
                    >
                      <div className="aspect-square w-full flex items-center justify-center mb-2 bg-white rounded-md overflow-hidden relative">
                        {loadingDocIds[doc.id] ? (
                          /* Loading skeleton animation */
                          <div className="w-full h-full flex flex-col items-center justify-center">
                            <div className="relative w-16 h-16">
                              {/* Pulsing background */}
                              <div className="absolute inset-0 bg-gray-200 rounded-lg animate-pulse" />
                              {/* Spinner overlay */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-8 h-8 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              </div>
                            </div>
                            <div className="mt-2 h-2 w-16 bg-gray-200 rounded animate-pulse" />
                          </div>
                        ) : documentPreviews[doc.id] ? (
                          <>
                            <img
                              src={documentPreviews[doc.id]}
                              alt={doc.original_name}
                              className="max-w-full max-h-full object-contain"
                            />
                            {/* PDF badge in bottom-right corner */}
                            {doc.mime_type === 'application/pdf' && (
                              <div className="absolute bottom-1 right-1 bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm flex items-center gap-0.5">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5zm5 0c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5-1.5.67-1.5 1.5z"/>
                                </svg>
                                PDF
                              </div>
                            )}
                          </>
                        ) : doc.mime_type === 'application/pdf' ? (
                          <div className="flex flex-col items-center justify-center text-red-600">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs mt-1 font-medium">PDF</span>
                          </div>
                        ) : doc.mime_type.includes('word') ? (
                          <div className="flex flex-col items-center justify-center text-blue-600">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-xs mt-1 font-medium">DOC</span>
                          </div>
                        ) : doc.mime_type.includes('excel') || doc.mime_type.includes('spreadsheet') ? (
                          <div className="flex flex-col items-center justify-center text-green-600">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-xs mt-1 font-medium">XLS</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs mt-1 font-medium">{t('common.file')}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 truncate font-medium" title={doc.original_name}>
                        {doc.original_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {doc.file_size < 1024 ? `${doc.file_size} B` :
                         doc.file_size < 1024 * 1024 ? `${(doc.file_size / 1024).toFixed(1)} KB` :
                         `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`}
                      </p>
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg">
                        <span className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium transition-opacity">
                          {t('common.detail')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowDocumentPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
