import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/api'

interface TableStatus {
  name: string
  label: string
  status: 'pending' | 'in_progress' | 'completed' | 'error'
  deletedCount?: number
  error?: string
}

interface ClearDataProgressProps {
  isOpen: boolean
  onComplete: () => void
  onError: (message: string) => void
}

const TABLE_NAMES = [
  'payments',
  'installments',
  'debts',
  'transaction_documents',
  'transactions',
  'project_grants',
  'project_milestones',
  'projects',
  'exchange_rates',
  'files',
]

export function ClearDataProgress({ isOpen, onComplete, onError }: ClearDataProgressProps) {
  const { t } = useTranslation()
  const [tableStatuses, setTableStatuses] = useState<TableStatus[]>([])
  const [started, setStarted] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  // Reset and start when modal opens
  useEffect(() => {
    if (!isOpen) {
      setStarted(false)
      setIsComplete(false)
      setTableStatuses([])
      return
    }

    // Already started, don't restart
    if (started) return

    // Initialize table statuses
    const initialStatuses: TableStatus[] = TABLE_NAMES.map((name) => ({
      name,
      label: t(`databaseOps.clearProgress.tables.${name}`),
      status: 'pending' as const,
    }))
    setTableStatuses(initialStatuses)
    setStarted(true)

    // Start processing
    const processAllTables = async () => {
      for (let i = 0; i < TABLE_NAMES.length; i++) {
        const tableName = TABLE_NAMES[i]

        // Update status to in_progress
        setTableStatuses((prev) =>
          prev.map((ts, idx) =>
            idx === i ? { ...ts, status: 'in_progress' as const } : ts
          )
        )

        try {
          console.log(`Clearing table: ${tableName}`)
          const result = await api.clearTable(tableName)
          console.log(`Result for ${tableName}:`, result)

          if (result.success) {
            setTableStatuses((prev) =>
              prev.map((ts, idx) =>
                idx === i
                  ? { ...ts, status: 'completed' as const, deletedCount: result.deleted_count }
                  : ts
              )
            )
          } else {
            throw new Error(result.message || 'Unknown error')
          }
        } catch (err) {
          console.error(`Error clearing ${tableName}:`, err)
          const errorMessage = err instanceof Error ? err.message : t('databaseOps.clearProgress.error')
          setTableStatuses((prev) =>
            prev.map((ts, idx) =>
              idx === i ? { ...ts, status: 'error' as const, error: errorMessage } : ts
            )
          )
          onError(errorMessage)
          return
        }
      }

      setIsComplete(true)
    }

    processAllTables()
  }, [isOpen, started, t, onError])

  if (!isOpen) return null

  const completedCount = tableStatuses.filter((ts) => ts.status === 'completed').length
  const progress = tableStatuses.length > 0 ? Math.round((completedCount / tableStatuses.length) * 100) : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-6 py-4">
          <h3 className="text-lg font-medium text-white flex items-center">
            {isComplete ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('databaseOps.clearProgress.complete')}
              </>
            ) : (
              <>
                <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {t('databaseOps.clearProgress.title')}
              </>
            )}
          </h3>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{completedCount} / {tableStatuses.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-red-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Table list */}
        <div className="px-6 py-4 max-h-80 overflow-y-auto">
          {tableStatuses.length === 0 ? (
            <div className="text-center text-gray-500 py-4">
              {t('common.loading')}
            </div>
          ) : (
            <ul className="space-y-2">
              {tableStatuses.map((ts) => (
                <li key={ts.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    {ts.status === 'completed' && (
                      <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {ts.status === 'in_progress' && (
                      <svg className="animate-spin w-4 h-4 mr-2 text-red-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {ts.status === 'pending' && (
                      <div className="w-4 h-4 mr-2 rounded-full border-2 border-gray-300" />
                    )}
                    {ts.status === 'error' && (
                      <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={ts.status === 'pending' ? 'text-gray-400' : 'text-gray-700'}>
                      {ts.label}
                    </span>
                  </div>
                  <span className="text-gray-500">
                    {ts.status === 'completed' && (
                      <span className="text-green-600">
                        {ts.deletedCount} {t('databaseOps.clearProgress.records')}
                      </span>
                    )}
                    {ts.status === 'in_progress' && (
                      <span className="text-red-500">{t('databaseOps.clearProgress.deleting')}</span>
                    )}
                    {ts.status === 'pending' && (
                      <span className="text-gray-400">{t('databaseOps.clearProgress.pending')}</span>
                    )}
                    {ts.status === 'error' && (
                      <span className="text-red-500">{ts.error}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {isComplete && (
          <div className="px-6 pb-4">
            <button
              onClick={onComplete}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {t('common.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
