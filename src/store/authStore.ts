import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '../types'
import { api } from '../api'

interface AuthState {
  user: Omit<User, 'password'> | null
  isLoggedIn: boolean
  isLoading: boolean
  error: string | null
  token: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
  setToken: (token: string | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,
      token: localStorage.getItem('auth_token'),

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          const result = await api.login(email, password)

          if (result.success && result.user) {
            const token = result.token || null
            set({
              user: result.user as Omit<User, 'password'>,
              isLoggedIn: true,
              isLoading: false,
              error: null,
              token
            })
            return true
          } else {
            set({
              user: null,
              isLoggedIn: false,
              isLoading: false,
              error: result.message,
              token: null
            })
            return false
          }
        } catch {
          set({
            user: null,
            isLoggedIn: false,
            isLoading: false,
            error: 'Bir hata oluştu. Lütfen tekrar deneyin.',
            token: null
          })
          return false
        }
      },

      logout: async () => {
        try {
          await api.logout()
        } finally {
          set({
            user: null,
            isLoggedIn: false,
            error: null,
            token: null
          })
        }
      },

      checkAuth: async () => {
        try {
          const user = await api.getCurrentUser()
          if (user) {
            set({
              user: user as Omit<User, 'password'>,
              isLoggedIn: true
            })
          } else {
            set({
              user: null,
              isLoggedIn: false,
              token: null
            })
          }
        } catch {
          set({
            user: null,
            isLoggedIn: false,
            token: null
          })
        }
      },

      clearError: () => set({ error: null }),

      setToken: (token: string | null) => {
        if (token) {
          localStorage.setItem('auth_token', token)
        } else {
          localStorage.removeItem('auth_token')
        }
        set({ token })
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn,
        token: state.token
      })
    }
  )
)
