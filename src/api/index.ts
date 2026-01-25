// API abstraction layer - automatically selects IPC or HTTP client based on environment
import type { IApiClient } from './types'
import { IpcClient } from './ipc-client'
import { HttpClient } from './http-client'

// Check if running in Electron environment
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && typeof window.electronApi !== 'undefined'
}

// Check if running in web environment
export const isWeb = (): boolean => {
  return !isElectron()
}

// Create the appropriate client based on environment
const createApiClient = (): IApiClient => {
  if (isElectron()) {
    console.log('Running in Electron mode - using IPC client')
    return new IpcClient()
  } else {
    console.log('Running in Web mode - using HTTP client')
    return new HttpClient()
  }
}

// Export a singleton instance of the API client
export const api: IApiClient = createApiClient()

// Export the HTTP client class for web-specific features
export { HttpClient } from './http-client'

// Export types
export * from './types'

// For backwards compatibility, also expose api on window object in web mode
// This allows existing code using window.api to continue working
if (typeof window !== 'undefined' && isWeb()) {
  (window as any).api = api
}
