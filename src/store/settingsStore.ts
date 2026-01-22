import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import i18n from '../i18n/config'

type Language = 'tr' | 'de' | 'en'

interface SettingsState {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: (localStorage.getItem('language') as Language) || 'tr',

      setLanguage: (lang: Language) => {
        i18n.changeLanguage(lang)
        localStorage.setItem('language', lang)
        set({ language: lang })
      }
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language
      })
    }
  )
)
