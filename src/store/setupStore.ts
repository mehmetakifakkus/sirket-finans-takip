import { create } from 'zustand'

export type SetupStep = 'welcome' | 'database' | 'admin' | 'seed' | 'complete'

interface SetupStatus {
  needsSetup: boolean
  hasDatabase: boolean
  hasUsers: boolean
  hasTables: boolean
}

interface AdminData {
  name: string
  email: string
  password: string
}

interface SeedOptions {
  categories: boolean
  exchangeRates: boolean
  demoData: boolean
}

interface SetupState {
  // Status
  needsSetup: boolean | null
  isChecking: boolean
  currentStep: SetupStep
  isProcessing: boolean
  error: string | null
  statusMessage: string | null

  // Data
  adminData: AdminData
  seedOptions: SeedOptions
  seedDetails: string[]

  // Actions
  checkSetupStatus: () => Promise<void>
  setStep: (step: SetupStep) => void
  initDatabase: () => Promise<boolean>
  createAdmin: (useDefaults: boolean, customData?: AdminData) => Promise<boolean>
  seedData: () => Promise<boolean>
  setAdminData: (data: Partial<AdminData>) => void
  setSeedOptions: (options: Partial<SeedOptions>) => void
  clearError: () => void
}

export const useSetupStore = create<SetupState>()((set, get) => ({
  // Initial state
  needsSetup: null,
  isChecking: true,
  currentStep: 'welcome',
  isProcessing: false,
  error: null,
  statusMessage: null,

  adminData: {
    name: 'Admin User',
    email: 'admin@sirket.com',
    password: 'admin123'
  },

  seedOptions: {
    categories: true,
    exchangeRates: true,
    demoData: false
  },

  seedDetails: [],

  checkSetupStatus: async () => {
    set({ isChecking: true, error: null })
    try {
      const status: SetupStatus = await window.api.checkSetupStatus()
      set({
        needsSetup: status.needsSetup,
        isChecking: false
      })
    } catch (error) {
      console.error('Setup status check error:', error)
      set({
        needsSetup: true,
        isChecking: false,
        error: 'Kurulum durumu kontrol edilemedi'
      })
    }
  },

  setStep: (step: SetupStep) => {
    set({ currentStep: step, error: null, statusMessage: null })
  },

  initDatabase: async () => {
    set({ isProcessing: true, error: null, statusMessage: 'Veritabani olusturuluyor...' })
    try {
      const result = await window.api.initDatabase()
      if (result.success) {
        set({
          isProcessing: false,
          statusMessage: result.message,
          currentStep: 'admin'
        })
        return true
      } else {
        set({
          isProcessing: false,
          error: result.message
        })
        return false
      }
    } catch (error) {
      console.error('Database init error:', error)
      set({
        isProcessing: false,
        error: 'Veritabani olusturulamadi'
      })
      return false
    }
  },

  createAdmin: async (useDefaults: boolean, customData?: AdminData) => {
    const adminData = useDefaults ? get().adminData : customData!
    set({ isProcessing: true, error: null, statusMessage: 'Yonetici hesabi olusturuluyor...' })
    try {
      const result = await window.api.createAdmin(adminData)
      if (result.success) {
        set({
          isProcessing: false,
          statusMessage: result.message,
          currentStep: 'seed'
        })
        return true
      } else {
        set({
          isProcessing: false,
          error: result.message
        })
        return false
      }
    } catch (error) {
      console.error('Admin create error:', error)
      set({
        isProcessing: false,
        error: 'Yonetici hesabi olusturulamadi'
      })
      return false
    }
  },

  seedData: async () => {
    const options = get().seedOptions
    set({ isProcessing: true, error: null, statusMessage: 'Veriler ekleniyor...' })
    try {
      const result = await window.api.seedData(options)
      set({
        isProcessing: false,
        statusMessage: result.message,
        seedDetails: result.details,
        currentStep: 'complete',
        needsSetup: false // Setup is complete, no longer needed
      })
      return result.success
    } catch (error) {
      console.error('Seed data error:', error)
      set({
        isProcessing: false,
        error: 'Veriler eklenirken hata olustu'
      })
      return false
    }
  },

  setAdminData: (data: Partial<AdminData>) => {
    set((state) => ({
      adminData: { ...state.adminData, ...data }
    }))
  },

  setSeedOptions: (options: Partial<SeedOptions>) => {
    set((state) => ({
      seedOptions: { ...state.seedOptions, ...options }
    }))
  },

  clearError: () => set({ error: null })
}))
