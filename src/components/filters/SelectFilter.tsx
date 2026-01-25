import { useTranslation } from 'react-i18next'

interface Option {
  value: string
  label: string
}

interface SelectFilterProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: Option[]
  allLabel?: string
  showAll?: boolean
  className?: string
  disabled?: boolean
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
  allLabel,
  showAll = true,
  className = '',
  disabled = false
}: SelectFilterProps) {
  const { t } = useTranslation()
  const resolvedAllLabel = allLabel || t('common.all')

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        }`}
      >
        {showAll && <option value="">{resolvedAllLabel}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
