import { useState, useEffect } from 'react'
import { api } from '@/api'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import { ClearDataProgress } from '../components/ClearDataProgress'

interface DatabaseStats {
  size: string
  tables: number
  records: Record<string, number>
}

// Content component for embedding in AdminPanel
export function DatabaseContent() {
  const { t } = useTranslation()
  const { addAlert } = useAppStore()
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showClearProgress, setShowClearProgress] = useState(false)

  const loadStats = async () => {
    try {
      const result = await api.getDatabaseStats()
      setStats(result)
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      const result = await api.exportDatabaseSQL()
      if (result.success) {
        addAlert('success', t('databaseOps.export.success'))
      } else if (result.message !== 'Export cancelled') {
        addAlert('error', result.message || t('databaseOps.export.failed'))
      }
    } catch (err) {
      addAlert('error', t('databaseOps.export.failed'))
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    const confirmed = await api.confirm(
      t('databaseOps.import.confirmMessage'),
      t('databaseOps.import.confirmTitle')
    )

    if (!confirmed) return

    setImporting(true)
    try {
      const result = await api.importDatabaseSQL()
      if (result.success) {
        addAlert('success', t('databaseOps.import.success'))
        loadStats()
      } else if (result.message !== 'Import cancelled') {
        addAlert('error', result.message || t('databaseOps.import.failed'))
      }
    } catch (err) {
      addAlert('error', t('databaseOps.import.failed'))
    } finally {
      setImporting(false)
    }
  }

  const handleClearData = async () => {
    const confirmed = await api.confirm(
      t('databaseOps.dangerous.confirmClear'),
      t('databaseOps.dangerous.title')
    )

    if (!confirmed) return

    setShowClearProgress(true)
  }

  const handleClearComplete = () => {
    setShowClearProgress(false)
    addAlert('success', t('databaseOps.clearProgress.complete'))
    loadStats()
  }

  const handleClearError = (message: string) => {
    setShowClearProgress(false)
    addAlert('error', message)
  }

  const tableNameMap: Record<string, string> = {
    users: t('databaseOps.tables.users'),
    categories: t('databaseOps.tables.categories'),
    parties: t('databaseOps.tables.parties'),
    exchange_rates: t('databaseOps.tables.exchangeRates'),
    projects: t('databaseOps.tables.projects'),
    project_milestones: t('databaseOps.tables.milestones'),
    debts: t('databaseOps.tables.debts'),
    installments: t('databaseOps.tables.installments'),
    payments: t('databaseOps.tables.payments'),
    transactions: t('databaseOps.tables.transactions'),
    audit_logs: t('databaseOps.tables.auditLogs')
  }

  return (
    <div className="space-y-6">
        {/* Database Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('databaseOps.stats.title')}
          </h2>

          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </div>
          ) : stats ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="bg-blue-50 rounded-lg px-4 py-3">
                  <div className="text-sm text-blue-600">{t('databaseOps.stats.size')}</div>
                  <div className="text-lg font-semibold text-blue-900">{stats.size}</div>
                </div>
                <div className="bg-green-50 rounded-lg px-4 py-3">
                  <div className="text-sm text-green-600">{t('databaseOps.stats.tables')}</div>
                  <div className="text-lg font-semibold text-green-900">{stats.tables}</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">{t('databaseOps.stats.records')}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {Object.entries(stats.records).map(([table, count]) => (
                    <div key={table} className="bg-gray-50 rounded px-3 py-2 flex justify-between items-center">
                      <span className="text-sm text-gray-600">{tableNameMap[table] || table}</span>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">{t('common.dataLoadError')}</p>
          )}
        </div>

        {/* Export Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {t('databaseOps.export.title')}
          </h2>
          <p className="text-gray-600 mb-4">{t('databaseOps.export.description')}</p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('common.loading')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {t('databaseOps.export.button')}
              </>
            )}
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('databaseOps.import.title')}
          </h2>
          <p className="text-gray-600 mb-2">{t('databaseOps.import.description')}</p>
          <p className="text-amber-600 text-sm mb-4 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {t('databaseOps.import.warning')}
          </p>
          <button
            onClick={handleImport}
            disabled={importing}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('common.loading')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {t('databaseOps.import.button')}
              </>
            )}
          </button>
        </div>

        {/* Dangerous Operations */}
        <div className="bg-white rounded-lg shadow p-6 border-2 border-red-200">
          <h2 className="text-lg font-medium text-red-900 mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {t('databaseOps.dangerous.title')}
          </h2>
          <p className="text-gray-600 mb-2">{t('databaseOps.dangerous.clearDataDesc')}</p>
          <button
            onClick={handleClearData}
            disabled={showClearProgress}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('databaseOps.dangerous.clearData')}
          </button>
        </div>

      {/* Clear Data Progress Modal */}
      <ClearDataProgress
        isOpen={showClearProgress}
        onComplete={handleClearComplete}
        onError={handleClearError}
      />
    </div>
  )
}

// Wrapper component for standalone page use (backward compatibility)
export function DatabaseOperations() {
  const { t } = useTranslation()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('databaseOps.title')}</h1>
      <DatabaseContent />
    </div>
  )
}
