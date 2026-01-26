import { useState, useEffect } from 'react'
import { api } from '@/api'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/appStore'
import type { TransactionDocument } from '../types'

interface DocumentUploadProps {
  transactionId: number | null
  onDocumentsChange?: (count: number) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.includes('word')) return 'doc'
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'xls'
  return 'file'
}

export function DocumentUpload({ transactionId, onDocumentsChange }: DocumentUploadProps) {
  const { t } = useTranslation()
  const { addAlert } = useAppStore()
  const [documents, setDocuments] = useState<TransactionDocument[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (transactionId) {
      loadDocuments()
    } else {
      setDocuments([])
    }
  }, [transactionId])

  const loadDocuments = async () => {
    if (!transactionId) return
    try {
      const docs = await api.getDocuments(transactionId)
      setDocuments(docs as TransactionDocument[])
      onDocumentsChange?.(docs.length)
    } catch (error) {
      console.error('Error loading documents:', error)
    }
  }

  const handleAddDocument = async () => {
    if (!transactionId) return

    setLoading(true)
    try {
      const result = await api.addDocument(transactionId)
      if (result.success && result.document) {
        setDocuments(prev => [result.document!, ...prev])
        onDocumentsChange?.(documents.length + 1)
        addAlert('success', t('transactions.documents.uploadSuccess'))
      } else if (result.message !== 'Dosya seçilmedi') {
        addAlert('error', result.message || t('transactions.documents.uploadFailed'))
      }
    } catch (error) {
      addAlert('error', t('transactions.documents.uploadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteDocument = async (doc: TransactionDocument) => {
    const confirmed = await api.confirm(t('transactions.documents.deleteConfirm'))
    if (!confirmed) return

    try {
      const result = await api.deleteDocument(doc.id)
      if (result.success) {
        setDocuments(prev => prev.filter(d => d.id !== doc.id))
        onDocumentsChange?.(documents.length - 1)
        addAlert('success', t('transactions.documents.deleteSuccess'))
      } else {
        addAlert('error', result.message || t('transactions.documents.deleteFailed'))
      }
    } catch (error) {
      addAlert('error', t('transactions.documents.deleteFailed'))
    }
  }

  const handleOpenDocument = async (doc: TransactionDocument) => {
    try {
      await api.openDocument(doc.filename)
    } catch (error) {
      addAlert('error', t('transactions.documents.openFailed'))
    }
  }

  const renderFileIcon = (mimeType: string) => {
    const iconType = getFileIcon(mimeType)

    if (iconType === 'image') {
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    }

    if (iconType === 'pdf') {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    }

    if (iconType === 'doc') {
      return (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }

    if (iconType === 'xls') {
      return (
        <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }

    return (
      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  }

  // Don't render if no transaction ID (new transaction not yet saved)
  if (!transactionId) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          {t('transactions.documents.title')}
        </label>
        <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500 text-sm bg-gray-50">
          <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p>{t('transactions.documents.noDocuments')}</p>
          <p className="text-xs mt-1 text-gray-400">
            {t('common.save')} &rarr; {t('transactions.documents.addDocument')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          {t('transactions.documents.title')}
        </label>
        <button
          type="button"
          onClick={handleAddDocument}
          disabled={loading}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 disabled:opacity-50"
        >
          {loading ? (
            <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
          {t('transactions.documents.addDocument')}
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500 text-sm">
          {t('transactions.documents.noDocuments')}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {renderFileIcon(doc.mime_type)}
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleOpenDocument(doc)}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate block text-left"
                    title={doc.original_name}
                  >
                    {doc.original_name}
                  </button>
                  <p className="text-xs text-gray-500">{formatFileSize(doc.file_size)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleOpenDocument(doc)}
                  className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                  title={t('common.detail')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDocument(doc)}
                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md"
                  title={t('common.delete')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
