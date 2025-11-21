// ==========================================
// SETUP TEST GLOBALE
// ==========================================
// Configurazione eseguita prima di ogni test
// ==========================================

import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Cleanup automatico dopo ogni test
afterEach(() => {
  cleanup()
})

// Mock delle variabili d'ambiente per i test
global.import = {
  meta: {
    env: {
      VITE_APPWRITE_ENDPOINT: 'https://cloud.appwrite.io/v1',
      VITE_APPWRITE_PROJECT_ID: 'test-project-id',
      VITE_APPWRITE_DATABASE_ID: 'test-database-id',
      VITE_APPWRITE_ROUTES_COLLECTION_ID: 'test-routes-collection',
      VITE_APPWRITE_ACHIEVEMENTS_COLLECTION_ID: 'test-achievements-collection',
    }
  }
}