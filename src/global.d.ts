/// <reference types="vite/client" />

import type { IElectronAPI } from '../electron/preload'

declare global {
  interface Window {
    api: IElectronAPI
  }
}

export {}
