import { useAppStore } from '../../store/appStore'

export function Topbar() {
  const { toggleSidebar } = useAppStore()

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-20 md:hidden">
      <button
        onClick={toggleSidebar}
        className="p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Toggle sidebar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </header>
  )
}
