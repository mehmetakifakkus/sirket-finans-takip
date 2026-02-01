import { useState, useRef, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface DateRangePickerProps {
  dateFrom: string
  dateTo: string
  onChange: (from: string, to: string) => void
  className?: string
}

export type PresetKey = 'all' | 'last7Days' | 'lastMonth' | 'lastYear'

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

interface CalendarMonthProps {
  label: string
  selectedDate: string
  onDateSelect: (date: string) => void
  weekdays: string[]
  months: string[]
}

function CalendarMonth({ label, selectedDate, onDateSelect, weekdays, months }: CalendarMonthProps) {
  const selectedParsed = parseDate(selectedDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Initialize displayed month based on selected date or today
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    if (selectedParsed) {
      return new Date(selectedParsed.getFullYear(), selectedParsed.getMonth(), 1)
    }
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })

  // Update displayed month when selectedDate changes
  useEffect(() => {
    if (selectedParsed) {
      setDisplayedMonth(new Date(selectedParsed.getFullYear(), selectedParsed.getMonth(), 1))
    }
  }, [selectedDate])

  const goToPrevMonth = () => {
    setDisplayedMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setDisplayedMonth(new Date(displayedMonth.getFullYear(), displayedMonth.getMonth() + 1, 1))
  }

  // Get days to display in the calendar grid
  const getDaysInGrid = () => {
    const year = displayedMonth.getFullYear()
    const month = displayedMonth.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)

    // Day of week for first day (0 = Sunday, we want Monday = 0)
    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek < 0) startDayOfWeek = 6 // Sunday becomes 6

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Add days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({ date, isCurrentMonth: false })
    }

    // Add days from current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true })
    }

    // Add days from next month to fill 6 rows (42 cells)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }

    return days
  }

  const days = getDaysInGrid()

  const isSelected = (date: Date) => {
    if (!selectedParsed) return false
    return date.getFullYear() === selectedParsed.getFullYear() &&
           date.getMonth() === selectedParsed.getMonth() &&
           date.getDate() === selectedParsed.getDate()
  }

  const isToday = (date: Date) => {
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate()
  }

  const handleDayClick = (date: Date) => {
    onDateSelect(formatDate(date))
  }

  return (
    <div className="p-3 min-w-[220px]">
      <div className="text-xs font-medium text-gray-500 mb-2">{label}</div>

      {/* Month/Year Header with Navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={goToPrevMonth}
          className="p-1 hover:bg-gray-100 rounded text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-800">
          {months[displayedMonth.getMonth()]} {displayedMonth.getFullYear()}
        </span>
        <button
          type="button"
          onClick={goToNextMonth}
          className="p-1 hover:bg-gray-100 rounded text-gray-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-0 mb-1">
        {weekdays.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-0">
        {days.map((item, i) => {
          const selected = isSelected(item.date)
          const todayDate = isToday(item.date)

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleDayClick(item.date)}
              className={`
                w-7 h-7 text-xs rounded-full flex items-center justify-center
                transition-colors
                ${!item.isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                ${selected ? 'bg-blue-600 text-white' : ''}
                ${!selected && todayDate ? 'border border-blue-500 text-blue-600' : ''}
                ${!selected && item.isCurrentMonth ? 'hover:bg-gray-100' : ''}
                ${!selected && !item.isCurrentMonth ? 'hover:bg-gray-50' : ''}
              `}
            >
              {item.date.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function getPresetDates(preset: PresetKey): { from: string; to: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  switch (preset) {
    case 'all':
      return { from: '', to: '' }

    case 'last7Days': {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 6)
      return { from: formatDate(weekAgo), to: formatDate(today) }
    }

    case 'lastMonth': {
      const monthAgo = new Date(today)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return { from: formatDate(monthAgo), to: formatDate(today) }
    }

    case 'lastYear': {
      const yearAgo = new Date(today)
      yearAgo.setFullYear(yearAgo.getFullYear() - 1)
      return { from: formatDate(yearAgo), to: formatDate(today) }
    }

    default:
      return { from: '', to: '' }
  }
}

// Get date range for a specific month
function getMonthDates(year: number, month: number): { from: string; to: string } {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  return { from: formatDate(firstDay), to: formatDate(lastDay) }
}

// Generate last 12 months list
function getLast12Months(): { year: number; month: number }[] {
  const today = new Date()
  const months: { year: number; month: number }[] = []

  for (let i = 0; i < 12; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    months.push({ year: date.getFullYear(), month: date.getMonth() })
  }

  return months
}

export function detectPreset(dateFrom: string, dateTo: string): PresetKey | null {
  if (!dateFrom && !dateTo) return 'all'

  // First try exact match (for same-day detection)
  const presets: PresetKey[] = ['last7Days', 'lastMonth', 'lastYear']
  for (const preset of presets) {
    const { from, to } = getPresetDates(preset)
    if (from === dateFrom && to === dateTo) {
      return preset
    }
  }

  // If no exact match, try approximate detection based on day difference
  const fromDate = parseDate(dateFrom)
  const toDate = parseDate(dateTo)
  if (!fromDate || !toDate) return null

  const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))

  // ~7 days = last7Days (allow 6-7 days)
  if (diffDays >= 6 && diffDays <= 7) return 'last7Days'

  // ~30 days = lastMonth (allow 28-31 days)
  if (diffDays >= 28 && diffDays <= 31) return 'lastMonth'

  // ~365 days = lastYear (allow 364-366 days)
  if (diffDays >= 364 && diffDays <= 366) return 'lastYear'

  return null // Custom range
}

// Detect if a specific month is selected
export function detectSelectedMonth(dateFrom: string, dateTo: string): { year: number; month: number } | null {
  if (!dateFrom || !dateTo) return null

  const fromDate = parseDate(dateFrom)
  const toDate = parseDate(dateTo)

  if (!fromDate || !toDate) return null

  // Check if it's the first day of the month
  if (fromDate.getDate() !== 1) return null

  // Check if it's the last day of the same month
  const lastDayOfMonth = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0)
  if (toDate.getDate() !== lastDayOfMonth.getDate() ||
      toDate.getMonth() !== fromDate.getMonth() ||
      toDate.getFullYear() !== fromDate.getFullYear()) {
    return null
  }

  return { year: fromDate.getFullYear(), month: fromDate.getMonth() }
}

// Icons for presets
const PresetIcon = ({ preset }: { preset: PresetKey }) => {
  switch (preset) {
    case 'all':
      return (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      )
    case 'last7Days':
      return (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    case 'lastMonth':
      return (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    case 'lastYear':
      return (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    default:
      return null
  }
}

export function DateRangePicker({
  dateFrom,
  dateTo,
  onChange,
  className = ''
}: DateRangePickerProps) {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedMonthIndex, setHighlightedMonthIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const monthListRef = useRef<HTMLDivElement>(null)

  const currentPreset = useMemo(() => detectPreset(dateFrom, dateTo), [dateFrom, dateTo])
  const selectedMonth = useMemo(() => detectSelectedMonth(dateFrom, dateTo), [dateFrom, dateTo])
  const last12Months = useMemo(() => getLast12Months(), [])

  const presets: { key: PresetKey; label: string }[] = [
    { key: 'all', label: t('dateRange.all') },
    { key: 'last7Days', label: t('dateRange.last7Days') },
    { key: 'lastMonth', label: t('dateRange.last1Month') },
    { key: 'lastYear', label: t('dateRange.last1Year') }
  ]

  // Get localized weekdays and months
  const weekdays = t('dateRange.weekdays', { returnObjects: true }) as string[]
  const months = t('dateRange.months', { returnObjects: true }) as string[]

  // Fallback if translations are not loaded
  const safeWeekdays = Array.isArray(weekdays) ? weekdays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const safeMonths = Array.isArray(months) ? months : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const getDisplayValue = (): string => {
    // Check for "all" preset first
    if (currentPreset === 'all') {
      return t('dateRange.all')
    }

    // Check if a specific month is selected (higher priority than presets)
    if (selectedMonth) {
      return `${safeMonths[selectedMonth.month]} ${selectedMonth.year}`
    }

    // Check for other presets
    if (currentPreset) {
      const preset = presets.find(p => p.key === currentPreset)
      return preset?.label || t('dateRange.all')
    }

    if (dateFrom && dateTo) {
      return `${dateFrom} - ${dateTo}`
    }
    if (dateFrom) {
      return `${t('dateRange.from')}: ${dateFrom}`
    }
    if (dateTo) {
      return `${t('dateRange.to')}: ${dateTo}`
    }
    return t('dateRange.all')
  }

  // Reset highlighted index when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Find currently selected month index or start at 0
      const currentIndex = last12Months.findIndex(
        item => selectedMonth?.year === item.year && selectedMonth?.month === item.month
      )
      setHighlightedMonthIndex(currentIndex >= 0 ? currentIndex : 0)
    } else {
      setHighlightedMonthIndex(-1)
    }
  }, [isOpen, selectedMonth, last12Months])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedMonthIndex >= 0 && monthListRef.current) {
      const items = monthListRef.current.querySelectorAll('[data-month-item]')
      const item = items[highlightedMonthIndex] as HTMLElement
      if (item) {
        item.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedMonthIndex])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return

      if (event.key === 'Escape') {
        setIsOpen(false)
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlightedMonthIndex(prev =>
          prev < last12Months.length - 1 ? prev + 1 : prev
        )
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlightedMonthIndex(prev => prev > 0 ? prev - 1 : prev)
      } else if (event.key === 'Enter' && highlightedMonthIndex >= 0) {
        event.preventDefault()
        const item = last12Months[highlightedMonthIndex]
        handleMonthSelect(item.year, item.month)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, highlightedMonthIndex, last12Months])

  const handlePresetSelect = (preset: PresetKey) => {
    const { from, to } = getPresetDates(preset)
    onChange(from, to)
  }

  const handleDateChange = (type: 'from' | 'to', value: string) => {
    if (type === 'from') {
      onChange(value, dateTo)
    } else {
      onChange(dateFrom, value)
    }
  }

  const handleMonthSelect = (year: number, month: number) => {
    const { from, to } = getMonthDates(year, month)
    onChange(from, to)
  }

  const isMonthSelected = (year: number, month: number) => {
    return selectedMonth?.year === year && selectedMonth?.month === month
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-left bg-white flex items-center justify-between hover:border-gray-400 cursor-pointer ${
          isOpen ? 'border-blue-500 ring-1 ring-blue-500' : ''
        }`}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className={(dateFrom || dateTo) ? 'text-gray-900' : 'text-gray-500'}>
            {getDisplayValue()}
          </span>
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="flex">
            {/* Left: Start Date Calendar */}
            <CalendarMonth
              label={t('dateRange.from')}
              selectedDate={dateFrom}
              onDateSelect={(date) => handleDateChange('from', date)}
              weekdays={safeWeekdays}
              months={safeMonths}
            />

            {/* Middle: End Date Calendar */}
            <div className="border-l border-gray-200">
              <CalendarMonth
                label={t('dateRange.to')}
                selectedDate={dateTo}
                onDateSelect={(date) => handleDateChange('to', date)}
                weekdays={safeWeekdays}
                months={safeMonths}
              />
            </div>

            {/* Right: Month Dropdown + Preset Buttons */}
            <div className="py-1 min-w-[160px] border-l border-gray-200">
              {/* Month Dropdown */}
              <div className="px-3 py-1.5 border-b border-gray-100">
                <div className="text-[10px] font-medium text-gray-400 uppercase mb-1">{t('dateRange.selectMonth')}</div>
                <div ref={monthListRef} className="max-h-[100px] overflow-y-auto">
                  {last12Months.map((item, index) => {
                    const isSelected = isMonthSelected(item.year, item.month)
                    const isHighlighted = index === highlightedMonthIndex
                    return (
                      <button
                        key={`${item.year}-${item.month}`}
                        type="button"
                        data-month-item
                        onClick={() => handleMonthSelect(item.year, item.month)}
                        onMouseEnter={() => setHighlightedMonthIndex(index)}
                        className={`w-full px-2 py-1 text-left text-xs rounded flex items-center justify-between ${
                          isHighlighted ? 'bg-gray-100' : ''
                        } ${
                          isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-600'
                        }`}
                      >
                        <span className={isSelected ? 'font-medium' : ''}>
                          {safeMonths[item.month]} {item.year}
                        </span>
                        {isSelected && (
                          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Preset Buttons */}
              <div className="pt-1">
                {presets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => handlePresetSelect(preset.key)}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-gray-100 ${
                      currentPreset === preset.key ? 'bg-blue-50 text-blue-700' : 'text-gray-600'
                    }`}
                  >
                    <span className={currentPreset === preset.key ? 'text-blue-600' : 'text-gray-400'}>
                      <PresetIcon preset={preset.key} />
                    </span>
                    <span className={currentPreset === preset.key ? 'font-medium' : ''}>
                      {preset.label}
                    </span>
                    {currentPreset === preset.key && (
                      <svg className="w-3 h-3 ml-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
