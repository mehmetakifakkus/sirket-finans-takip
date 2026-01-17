import { create } from 'zustand'

interface Alert {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
}

interface AppState {
  sidebarOpen: boolean
  alerts: Alert[]
  isLoading: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  addAlert: (type: Alert['type'], message: string) => void
  removeAlert: (id: string) => void
  clearAlerts: () => void
  setLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  alerts: [],
  isLoading: false,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  addAlert: (type, message) => {
    const id = Math.random().toString(36).substring(7)
    set((state) => ({
      alerts: [...state.alerts, { id, type, message }]
    }))

    // Auto remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        alerts: state.alerts.filter((a) => a.id !== id)
      }))
    }, 5000)
  },

  removeAlert: (id) => set((state) => ({
    alerts: state.alerts.filter((a) => a.id !== id)
  })),

  clearAlerts: () => set({ alerts: [] }),

  setLoading: (loading) => set({ isLoading: loading })
}))
