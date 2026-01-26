/**
 * API Client Factory
 * Automatically selects IPC (Electron) or HTTP (Web) client based on platform
 */

import type { IApiClient } from './types'
import { ipcClient } from './ipc-client'
import { httpClient } from './http-client'

/**
 * Detect if running in Electron environment
 */
function isElectron(): boolean {
  // Check if window.api exists (set by Electron preload script)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (window as any).api !== 'undefined'
}

/**
 * Get the appropriate API client for the current platform
 */
export function getApiClient(): IApiClient {
  if (isElectron()) {
    return ipcClient
  }
  return httpClient
}

/**
 * Singleton API client instance
 */
export const api: IApiClient = getApiClient()

/**
 * Re-export types
 */
export type { IApiClient } from './types'

/**
 * Platform detection helper
 */
export const platform = {
  isElectron: isElectron(),
  isWeb: !isElectron(),
}
