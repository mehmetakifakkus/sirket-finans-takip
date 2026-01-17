import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { MainLayout } from './components/layout/MainLayout'
import { Login } from './pages/Login'
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
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/debts" element={<Debts />} />
          <Route path="/debts/:id" element={<DebtDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/reports" element={<Reports />} />

          {/* Admin only routes */}
          <Route element={<AdminRoute />}>
            <Route path="/users" element={<Users />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/exchange-rates" element={<ExchangeRates />} />
          </Route>
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
