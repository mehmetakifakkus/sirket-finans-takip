import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  user: Omit<User, 'password'> | null
  isLoggedIn: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })

        try {
          const result = await window.api.login(email, password)

          if (result.success && result.user) {
            set({
              user: result.user as Omit<User, 'password'>,
              isLoggedIn: true,
              isLoading: false,
              error: null
            })
            return true
          } else {
            set({
              user: null,
              isLoggedIn: false,
              isLoading: false,
              error: result.message
            })
            return false
          }
        } catch {
          set({
            user: null,
            isLoggedIn: false,
            isLoading: false,
            error: 'Bir hata oluştu. Lütfen tekrar deneyin.'
          })
          return false
        }
      },

      logout: async () => {
        try {
          await window.api.logout()
        } finally {
          set({
            user: null,
            isLoggedIn: false,
            error: null
          })
        }
      },

      checkAuth: async () => {
        try {
          const user = await window.api.getCurrentUser()
          if (user) {
            set({
              user: user as Omit<User, 'password'>,
              isLoggedIn: true
            })
          } else {
            set({
              user: null,
              isLoggedIn: false
            })
          }
        } catch {
          set({
            user: null,
            isLoggedIn: false
          })
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isLoggedIn: state.isLoggedIn
      })
    }
  )
)
