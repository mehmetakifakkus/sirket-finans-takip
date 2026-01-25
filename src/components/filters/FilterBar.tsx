interface FilterBarProps {
  columns?: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
  className?: string
}

const columnClasses = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
  6: 'md:grid-cols-6'
}

export function FilterBar({ columns = 4, children, className = '' }: FilterBarProps) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      <div className={`grid grid-cols-1 ${columnClasses[columns]} gap-4`}>
        {children}
      </div>
    </div>
  )
}
