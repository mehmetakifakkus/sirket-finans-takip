/// <reference types="vite/client" />

import type { IApiClient } from './api/types'

// For backwards compatibility and type safety
declare global {
  interface Window {
    // Web environment uses the api abstraction layer
    api: IApiClient
    // Electron environment exposes electronApi via preload
    electronApi?: IApiClient
  }
}

// Vite environment variables
interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_PLATFORM?: 'web' | 'electron'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

export {}
