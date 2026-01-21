import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  {
    title: 'Dashboard',
    path: '/',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )
  }
]

const transactionItems = [
  {
    title: 'Gelir / Gider',
    path: '/transactions',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
]

const debtItems = [
  {
    title: 'Borç / Alacak',
    path: '/debts',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )
  },
  {
    title: 'Ödemeler',
    path: '/payments',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  }
]

const projectItems = [
  {
    title: 'Projeler',
    path: '/projects',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )
  }
]

const recordItems = [
  {
    title: 'Taraflar',
    path: '/parties',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  }
]

const reportItems = [
  {
    title: 'Raporlar',
    path: '/reports',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }
]

const adminItems = [
  {
    title: 'Kategoriler',
    path: '/categories',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    )
  },
  {
    title: 'Döviz Kurları',
    path: '/exchange-rates',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    )
  },
  {
    title: 'Kullanıcılar',
    path: '/users',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  }
]

interface NavItemProps {
  item: typeof navItems[0]
  badge?: number
}

function NavItem({ item, badge }: NavItemProps) {
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `flex items-center justify-between px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors duration-200 ${
          isActive ? 'bg-gray-800' : ''
        }`
      }
    >
      <div className="flex items-center">
        <span className="mr-3">{item.icon}</span>
        {item.title}
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-amber-500 text-white rounded-full">
          {badge}
        </span>
      )}
    </NavLink>
  )
}

interface NavSectionProps {
  title: string
  items: typeof navItems
  badges?: Record<string, number>
}

function NavSection({ title, items, badges }: NavSectionProps) {
  return (
    <div className="pt-4">
      <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {title}
      </p>
      {items.map((item) => (
        <NavItem key={item.path} item={item} badge={badges?.[item.path]} />
      ))}
    </div>
  )
}

export function Sidebar() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'
  const [incompleteProjectCount, setIncompleteProjectCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await window.api.getIncompleteProjectsCount()
        setIncompleteProjectCount(count)
      } catch {
        // ignore errors
      }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 30000) // 30 saniyede bir guncelle
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Finans Takip</h1>
        <p className="text-xs text-gray-400 mt-1">Sirket Yonetim Sistemi</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}

        <NavSection title="Islemler" items={transactionItems} />
        <NavSection title="Borc / Alacak" items={debtItems} />
        <NavSection title="Projeler" items={projectItems} badges={{ '/projects': incompleteProjectCount }} />
        <NavSection title="Kayitlar" items={recordItems} />
        <NavSection title="Raporlar" items={reportItems} />

        {isAdmin && <NavSection title="Ayarlar" items={adminItems} />}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
        Sirket Finans Takip v1.0
      </div>
    </aside>
  )
}
