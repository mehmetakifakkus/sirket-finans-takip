import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'

export function Topbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
      <div className="flex items-center justify-between">
        {/* Left side - can add search or breadcrumbs later */}
        <div className="flex items-center">
          {/* Placeholder for future content */}
        </div>

        {/* Right side - user menu */}
        <div className="flex items-center space-x-4">
          {/* User info */}
          <div className="flex items-center space-x-3">
            {/* User avatar */}
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>

            {/* User details */}
            <div className="hidden md:block">
              <p className="text-sm font-medium text-gray-700">{user?.name || 'Kullanici'}</p>
              <p className="text-xs text-gray-500">
                {user?.role === 'admin' ? 'Yonetici' : 'Personel'}
              </p>
            </div>
          </div>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Cikis
          </button>
        </div>
      </div>
    </header>
  )
}
