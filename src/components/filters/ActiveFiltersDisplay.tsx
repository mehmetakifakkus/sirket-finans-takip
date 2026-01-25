import { useTranslation } from 'react-i18next'

interface ActiveFilter {
  key: string
  label: string
  value: string
  onRemove: () => void
}

interface ActiveFiltersDisplayProps {
  filters: ActiveFilter[]
  onClearAll: () => void
  className?: string
}

export function ActiveFiltersDisplay({
  filters,
  onClearAll,
  className = ''
}: ActiveFiltersDisplayProps) {
  const { t } = useTranslation()

  if (filters.length === 0) {
    return null
  }

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-blue-700">
            <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {t('filters.activeFilters')}:
          </span>

          {filters.map(filter => (
            <span
              key={filter.key}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-blue-300 rounded-full text-sm text-blue-800"
            >
              <span className="text-gray-500 text-xs">{filter.label}:</span>
              {filter.value}
              <button
                onClick={filter.onRemove}
                className="ml-1 text-blue-500 hover:text-blue-700"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>

        <button
          onClick={onClearAll}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t('filters.clearAll')}
        </button>
      </div>
    </div>
  )
}
