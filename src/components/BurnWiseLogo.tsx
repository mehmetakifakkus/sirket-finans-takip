interface BurnWiseLogoProps {
  size?: 'sm' | 'md' | 'lg' | number
  animated?: boolean
  className?: string
}

const sizeMap = {
  sm: 24,
  md: 40,
  lg: 64
}

export function BurnWiseLogo({ size = 'md', animated = false, className = '' }: BurnWiseLogoProps) {
  const dimension = typeof size === 'number' ? size : sizeMap[size]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      fill="none"
      width={dimension}
      height={dimension}
      className={`${animated ? 'animate-flame' : ''} ${className}`}
    >
      <defs>
        <linearGradient id="flameGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#f97316' }} />
          <stop offset="50%" style={{ stopColor: '#fb923c' }} />
          <stop offset="100%" style={{ stopColor: '#fbbf24' }} />
        </linearGradient>
        <linearGradient id="innerGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#ea580c' }} />
          <stop offset="100%" style={{ stopColor: '#f97316' }} />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="32" cy="32" r="30" fill="#1e293b" />

      {/* Outer flame */}
      <path
        d="M32 8 C32 8 18 22 18 36 C18 44 24 52 32 52 C40 52 46 44 46 36 C46 22 32 8 32 8 Z M32 14 C32 14 42 24 42 36 C42 42 38 48 32 48 C26 48 22 42 22 36 C22 24 32 14 32 14 Z"
        fill="url(#flameGrad)"
      />

      {/* Inner flame */}
      <path
        d="M32 20 C32 20 24 30 24 38 C24 43 27.5 47 32 47 C36.5 47 40 43 40 38 C40 30 32 20 32 20 Z"
        fill="url(#innerGrad)"
      />

      {/* Chart bars inside flame */}
      <rect x="27" y="38" width="3" height="6" rx="1" fill="#fef3c7" />
      <rect x="31" y="34" width="3" height="10" rx="1" fill="#fef3c7" />
      <rect x="35" y="36" width="3" height="8" rx="1" fill="#fef3c7" />
    </svg>
  )
}
