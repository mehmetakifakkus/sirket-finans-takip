import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from './store/authStore'
import { useSetupStore } from './store/setupStore'
import { MainLayout } from './components/layout/MainLayout'
import { Login } from './pages/Login'
import { Setup } from './pages/Setup'
import { Dashboard } from './pages/Dashboard'
import { Parties } from './pages/Parties'
import { Transactions } from './pages/Transactions'
import { Categories } from './pages/Categories'
import { ExchangeRates } from './pages/ExchangeRates'
import { Debts } from './pages/Debts'
import { DebtDetail } from './pages/DebtDetail'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/ProjectDetail'
import { Payments } from './pages/Payments'
import { Reports } from './pages/Reports'
import { Users } from './pages/Users'
import { Settings } from './pages/Settings'
import { DatabaseOperations } from './pages/DatabaseOperations'

// Import i18n config
import './i18n/config'

// Loading spinner component
function LoadingScreen() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-600">{t('common.loading')}</p>
      </div>
    </div>
  )
}

// Protected route wrapper
function ProtectedRoute() {
  const { isLoggedIn } = useAuthStore()

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return <MainLayout />
}

// Admin route wrapper
function AdminRoute() {
  const { user } = useAuthStore()

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

// Public route wrapper (redirect if logged in)
function PublicRoute() {
  const { isLoggedIn } = useAuthStore()

  if (isLoggedIn) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default function App() {
  const { needsSetup, isChecking, checkSetupStatus } = useSetupStore()

  useEffect(() => {
    checkSetupStatus()
  }, [])

  if (isChecking) {
    return (
      <BrowserRouter>
        <LoadingScreen />
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Setup route - always accessible */}
        <Route path="/setup" element={<Setup />} />

        {/* Public routes */}
        <Route element={<PublicRoute />}>
          <Route
            path="/login"
            element={
              needsSetup ? <Navigate to="/setup" replace /> : <Login />
            }
          />
        </Route>

        {/* Protected routes - wrapped with setup check */}
        <Route
          element={
            needsSetup ? <Navigate to="/setup" replace /> : <ProtectedRoute />
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/debts" element={<Debts />} />
          <Route path="/debts/:id" element={<DebtDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />

          {/* Admin only routes */}
          <Route element={<AdminRoute />}>
            <Route path="/users" element={<Users />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/exchange-rates" element={<ExchangeRates />} />
            <Route path="/database-operations" element={<DatabaseOperations />} />
          </Route>
        </Route>

        {/* Catch all - redirect based on setup status */}
        <Route
          path="*"
          element={
            needsSetup ? <Navigate to="/setup" replace /> : <Navigate to="/" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
