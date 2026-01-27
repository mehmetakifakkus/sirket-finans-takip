import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import i18n from '../i18n/config'

type Language = 'tr' | 'de' | 'en'

interface NotificationSettings {
  enabled: boolean
  reminderDays: number[]
  showOverdue: boolean
}

interface SettingsState {
  language: Language
  notifications: NotificationSettings
  setLanguage: (lang: Language) => void
  setNotificationEnabled: (enabled: boolean) => void
  setReminderDays: (days: number[]) => void
  setShowOverdue: (show: boolean) => void
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void
}

const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  reminderDays: [1, 3, 7],
  showOverdue: true,
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: (localStorage.getItem('language') as Language) || 'tr',
      notifications: defaultNotificationSettings,

      setLanguage: (lang: Language) => {
        i18n.changeLanguage(lang)
        localStorage.setItem('language', lang)
        set({ language: lang })
      },

      setNotificationEnabled: (enabled) =>
        set((state) => ({
          notifications: { ...state.notifications, enabled }
        })),

      setReminderDays: (days) =>
        set((state) => ({
          notifications: { ...state.notifications, reminderDays: days }
        })),

      setShowOverdue: (show) =>
        set((state) => ({
          notifications: { ...state.notifications, showOverdue: show }
        })),

      updateNotificationSettings: (settings) =>
        set((state) => ({
          notifications: { ...state.notifications, ...settings }
        })),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        notifications: state.notifications
      })
    }
  )
)
