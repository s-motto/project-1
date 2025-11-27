// ==========================================
// TEST PER ROUTESSERVICE.JS
// ==========================================
// Test del servizio CRUD percorsi su Appwrite:
// - saveRoute: CREATE nuovo percorso
// - getUserRoutes, getSavedRoutes, getCompletedRoutes, getRoute: READ
// - updateRouteName, updateRoute, completeRoute: UPDATE
// - deleteRoute: DELETE
// ==========================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import routesService from '../routesService'
import { databases } from '../../appwrite'
import { ID, Query } from 'appwrite'

// ==========================================
// MOCK APPWRITE SDK
// ==========================================

vi.mock('../../appwrite', () => ({
  databases: {
    createDocument: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn()
  }
}))

vi.mock('appwrite', () => ({
  ID: {
    unique: vi.fn(() => 'test-unique-id')
  },
  Query: {
    equal: vi.fn((field, value) => `Query.equal("${field}", "${value}")`),
    orderDesc: vi.fn((field) => `Query.orderDesc("${field}")`),
    limit: vi.fn((value) => `Query.limit(${value})`)
  }
}))

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}))

// ==========================================
// HELPER: Crea route data mock
// ==========================================

function createMockRouteData({
  name = 'Test Route',
  distance = 10.5,
  duration = 120,
  ascent = 200,
  descent = 180,
  status = 'saved'
} = {}) {
  return {
    name,
    startPoint: { lat: 44.1, lon: 9.5 },
    endPoint: { lat: 44.2, lon: 9.6 },
    distance,
    duration,
    ascent,
    descent,
    coordinates: [[9.5, 44.1], [9.55, 44.15], [9.6, 44.2]],
    instructions: [
      { text: 'Vai dritto', distance: 100 },
      { text: 'Gira a destra', distance: 200 }
    ],
    status
  }
}

function createMockDocument({
  $id = 'route-123',
  userId = 'user-456',
  name = 'Test Route',
  distance = 10.5,
  duration = 120,
  ascent = 200,
  descent = 180,
  status = 'saved',
  createdAt = '2024-01-15T10:00:00.000Z',
  completedAt = null,
  actualDistance = null,
  actualDuration = null,
  actualAscent = null,
  actualDescent = null,
  actualCoordinates = null
} = {}) {
  return {
    $id,
    userId,
    name,
    startPoint: JSON.stringify({ lat: 44.1, lon: 9.5 }),
    endPoint: JSON.stringify({ lat: 44.2, lon: 9.6 }),
    distance,
    duration,
    ascent,
    descent,
    coordinates: JSON.stringify([[9.5, 44.1], [9.55, 44.15], [9.6, 44.2]]),
    instructions: JSON.stringify([
      { text: 'Vai dritto', distance: 100 },
      { text: 'Gira a destra', distance: 200 }
    ]),
    status,
    createdAt,
    completedAt,
    actualDistance,
    actualDuration,
    actualAscent,
    actualDescent,
    actualCoordinates
  }
}

// ==========================================
// SETUP & TEARDOWN
// ==========================================

beforeEach(() => {
  vi.clearAllMocks()
})

// ==========================================
// TEST SAVE ROUTE (CREATE)
// ==========================================

describe('saveRoute - Salvataggio nuovo percorso', () => {
  it('salva un nuovo percorso con successo', async () => {
    const routeData = createMockRouteData()
    const userId = 'user-123'
    const mockDoc = createMockDocument({ userId })

    databases.createDocument.mockResolvedValue(mockDoc)

    const result = await routesService.saveRoute(routeData, userId)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(mockDoc)
    expect(databases.createDocument).toHaveBeenCalledTimes(1)
  })

  it('chiama createDocument con parametri corretti', async () => {
    const routeData = createMockRouteData({ name: 'Monte Bianco' })
    const userId = 'user-123'

    databases.createDocument.mockResolvedValue(createMockDocument())

    await routesService.saveRoute(routeData, userId)

    const call = databases.createDocument.mock.calls[0]
    expect(call[0]).toBeDefined() // DATABASE_ID (usa valore da env)
    expect(call[1]).toBe('routes') // COLLECTION_ID
    expect(call[2]).toBe('test-unique-id') // ID.unique()
    
    const data = call[3]
    expect(data.userId).toBe(userId)
    expect(data.name).toBe('Monte Bianco')
    expect(data.distance).toBe(10.5)
    expect(data.status).toBe('saved')
  })

  it('usa nome default se non fornito', async () => {
    const routeData = createMockRouteData()
    delete routeData.name
    const userId = 'user-123'

    databases.createDocument.mockResolvedValue(createMockDocument())

    await routesService.saveRoute(routeData, userId)

    const data = databases.createDocument.mock.calls[0][3]
    expect(data.name).toBe('Percorso senza nome')
  })

  it('serializza startPoint come JSON', async () => {
    const routeData = createMockRouteData()
    const userId = 'user-123'

    databases.createDocument.mockResolvedValue(createMockDocument())

    await routesService.saveRoute(routeData, userId)

    const data = databases.createDocument.mock.calls[0][3]
    expect(data.startPoint).toBe(JSON.stringify({ lat: 44.1, lon: 9.5 }))
  })

  it('serializza endPoint come JSON', async () => {
    const routeData = createMockRouteData()
    const userId = 'user-123'

    databases.createDocument.mockResolvedValue(createMockDocument())

    await routesService.saveRoute(routeData, userId)

    const data = databases.createDocument.mock.calls[0][3]
    expect(data.endPoint).toBe(JSON.stringify({ lat: 44.2, lon: 9.6 }))
  })

  it('serializza coordinates come JSON', async () => {
    const routeData = createMockRouteData()
    const userId = 'user-123'

    databases.createDocument.mockResolvedValue(createMockDocument())

    await routesService.saveRoute(routeData, userId)

    const data = databases.createDocument.mock.calls[0][3]
    const coords = JSON.parse(data.coordinates)
    expect(coords).toHaveLength(3)
    expect(coords[0]).toEqual([9.5, 44.1])
  })

  it('serializza instructions come JSON', async () => {
    const routeData = createMockRouteData()
    const userId = 'user-123'

    databases.createDocument.mockResolvedValue(createMockDocument())

    await routesService.saveRoute(routeData, userId)

    const data = databases.createDocument.mock.calls[0][3]
    const instructions = JSON.parse(data.instructions)
    expect(instructions).toHaveLength(2)
    expect(instructions[0].text).toBe('Vai dritto')
  })

  it('include timestamp createdAt', async () => {
    const routeData = createMockRouteData()
    const userId = 'user-123'

    databases.createDocument.mockResolvedValue(createMockDocument())

    await routesService.saveRoute(routeData, userId)

    const data = databases.createDocument.mock.calls[0][3]
    expect(data.createdAt).toBeDefined()
    expect(typeof data.createdAt).toBe('string')
  })

  it('gestisce status custom', async () => {
    const routeData = createMockRouteData({ status: 'emergency_save' })
    const userId = 'user-123'

    databases.createDocument.mockResolvedValue(createMockDocument({ status: 'emergency_save' }))

    await routesService.saveRoute(routeData, userId)

    const data = databases.createDocument.mock.calls[0][3]
    expect(data.status).toBe('emergency_save')
  })

  it('include campi opzionali se forniti (completedAt)', async () => {
    const routeData = createMockRouteData()
    routeData.completedAt = '2024-01-15T12:00:00.000Z'
    const userId = 'user-123'

    databases.createDocument.mockResolvedValue(createMockDocument())

    await routesService.saveRoute(routeData, userId)

    const data = databases.createDocument.mock.calls[0][3]
    expect(data.completedAt).toBe('2024-01-15T12:00:00.000Z')
  })

  it('include campi opzionali se forniti (actualDistance)', async () => {
    const routeData = createMockRouteData()
    routeData.actualDistance = 12.3
    const userId = 'user-123'

    databases.createDocument.mockResolvedValue(createMockDocument())

    await routesService.saveRoute(routeData, userId)

    const data = databases.createDocument.mock.calls[0][3]
    expect(data.actualDistance).toBe(12.3)
  })

  it('gestisce errore durante il salvataggio', async () => {
    const routeData = createMockRouteData()
    const userId = 'user-123'

    databases.createDocument.mockRejectedValue(new Error('Network error'))

    const result = await routesService.saveRoute(routeData, userId)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
  })

  it('salva percorso completato con dati tracking', async () => {
    const routeData = createMockRouteData()
    routeData.status = 'completed'
    routeData.completedAt = '2024-01-15T12:00:00.000Z'
    routeData.actualDistance = 11.2
    routeData.actualDuration = 125
    routeData.actualAscent = 210
    routeData.actualDescent = 190
    const userId = 'user-123'

    databases.createDocument.mockResolvedValue(createMockDocument({ status: 'completed' }))

    const result = await routesService.saveRoute(routeData, userId)

    expect(result.success).toBe(true)
    const data = databases.createDocument.mock.calls[0][3]
    expect(data.status).toBe('completed')
    expect(data.actualDistance).toBe(11.2)
  })
})

// ==========================================
// TEST GET USER ROUTES (READ ALL)
// ==========================================

describe('getUserRoutes - Recupera tutti i percorsi utente', () => {
  it('recupera tutti i percorsi con successo', async () => {
    const mockDocs = [
      createMockDocument({ $id: 'route-1', name: 'Route 1' }),
      createMockDocument({ $id: 'route-2', name: 'Route 2' })
    ]

    databases.listDocuments.mockResolvedValue({ documents: mockDocs })

    const result = await routesService.getUserRoutes('user-123')

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
    expect(databases.listDocuments).toHaveBeenCalledTimes(1)
  })

  it('parsa i JSON nei documenti restituiti', async () => {
    const mockDoc = createMockDocument()
    databases.listDocuments.mockResolvedValue({ documents: [mockDoc] })

    const result = await routesService.getUserRoutes('user-123')

    const route = result.data[0]
    expect(route.startPoint).toEqual({ lat: 44.1, lon: 9.5 })
    expect(route.endPoint).toEqual({ lat: 44.2, lon: 9.6 })
    expect(Array.isArray(route.coordinates)).toBe(true)
    expect(Array.isArray(route.instructions)).toBe(true)
  })

  it('chiama listDocuments con query corrette', async () => {
    databases.listDocuments.mockResolvedValue({ documents: [] })

    await routesService.getUserRoutes('user-123')

    const call = databases.listDocuments.mock.calls[0]
    expect(call[0]).toBeDefined() // DATABASE_ID
    expect(call[1]).toBe('routes') // COLLECTION_ID
    expect(call[2]).toEqual(
      expect.arrayContaining([
        'Query.equal("userId", "user-123")',
        'Query.orderDesc("createdAt")',
        'Query.limit(100)'
      ])
    )
  })

  it('restituisce array vuoto se nessun percorso', async () => {
    databases.listDocuments.mockResolvedValue({ documents: [] })

    const result = await routesService.getUserRoutes('user-123')

    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })

  it('gestisce errore durante il recupero', async () => {
    databases.listDocuments.mockRejectedValue(new Error('Database error'))

    const result = await routesService.getUserRoutes('user-123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Database error')
  })

  it('parsa actualCoordinates se presente', async () => {
    const mockDoc = createMockDocument({
      actualCoordinates: JSON.stringify([[9.51, 44.11], [9.56, 44.16]])
    })
    databases.listDocuments.mockResolvedValue({ documents: [mockDoc] })

    const result = await routesService.getUserRoutes('user-123')

    const route = result.data[0]
    expect(route.actualCoordinates).toBeDefined()
    expect(Array.isArray(route.actualCoordinates)).toBe(true)
    expect(route.actualCoordinates).toHaveLength(2)
  })

  it('gestisce actualCoordinates null', async () => {
    const mockDoc = createMockDocument({ actualCoordinates: null })
    databases.listDocuments.mockResolvedValue({ documents: [mockDoc] })

    const result = await routesService.getUserRoutes('user-123')

    const route = result.data[0]
    expect(route.actualCoordinates).toBeUndefined()
  })
})

// ==========================================
// TEST GET SAVED ROUTES
// ==========================================

describe('getSavedRoutes - Recupera solo percorsi salvati', () => {
  it('recupera solo percorsi con status=saved', async () => {
    const mockDocs = [
      createMockDocument({ $id: 'route-1', status: 'saved' }),
      createMockDocument({ $id: 'route-2', status: 'saved' })
    ]

    databases.listDocuments.mockResolvedValue({ documents: mockDocs })

    const result = await routesService.getSavedRoutes('user-123')

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
  })

  it('chiama listDocuments con query status=saved', async () => {
    databases.listDocuments.mockResolvedValue({ documents: [] })

    await routesService.getSavedRoutes('user-123')

    const call = databases.listDocuments.mock.calls[0]
    expect(call[0]).toBeDefined() // DATABASE_ID
    expect(call[1]).toBe('routes') // COLLECTION_ID
    expect(call[2]).toEqual(
      expect.arrayContaining([
        'Query.equal("userId", "user-123")',
        'Query.equal("status", "saved")',
        'Query.orderDesc("createdAt")',
        'Query.limit(100)'
      ])
    )
  })

  it('gestisce errore durante il recupero', async () => {
    databases.listDocuments.mockRejectedValue(new Error('Network error'))

    const result = await routesService.getSavedRoutes('user-123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
  })
})

// ==========================================
// TEST GET COMPLETED ROUTES
// ==========================================

describe('getCompletedRoutes - Recupera solo percorsi completati', () => {
  it('recupera solo percorsi con status=completed', async () => {
    const mockDocs = [
      createMockDocument({ 
        $id: 'route-1', 
        status: 'completed',
        completedAt: '2024-01-15T12:00:00.000Z'
      }),
      createMockDocument({ 
        $id: 'route-2', 
        status: 'completed',
        completedAt: '2024-01-10T10:00:00.000Z'
      })
    ]

    databases.listDocuments.mockResolvedValue({ documents: mockDocs })

    const result = await routesService.getCompletedRoutes('user-123')

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
  })

  it('chiama listDocuments con query status=completed e orderDesc completedAt', async () => {
    databases.listDocuments.mockResolvedValue({ documents: [] })

    await routesService.getCompletedRoutes('user-123')

    const call = databases.listDocuments.mock.calls[0]
    expect(call[0]).toBeDefined() // DATABASE_ID
    expect(call[1]).toBe('routes') // COLLECTION_ID
    expect(call[2]).toEqual(
      expect.arrayContaining([
        'Query.equal("userId", "user-123")',
        'Query.equal("status", "completed")',
        'Query.orderDesc("completedAt")',
        'Query.limit(100)'
      ])
    )
  })

  it('gestisce errore durante il recupero', async () => {
    databases.listDocuments.mockRejectedValue(new Error('Database error'))

    const result = await routesService.getCompletedRoutes('user-123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Database error')
  })
})

// ==========================================
// TEST GET ROUTE (READ SINGLE)
// ==========================================

describe('getRoute - Recupera singolo percorso', () => {
  it('recupera un percorso singolo con successo', async () => {
    const mockDoc = createMockDocument({ $id: 'route-123' })
    databases.getDocument.mockResolvedValue(mockDoc)

    const result = await routesService.getRoute('route-123')

    expect(result.success).toBe(true)
    expect(result.data.$id).toBe('route-123')
    expect(databases.getDocument).toHaveBeenCalledTimes(1)
  })

  it('parsa i JSON nel documento restituito', async () => {
    const mockDoc = createMockDocument()
    databases.getDocument.mockResolvedValue(mockDoc)

    const result = await routesService.getRoute('route-123')

    const route = result.data
    expect(route.startPoint).toEqual({ lat: 44.1, lon: 9.5 })
    expect(route.endPoint).toEqual({ lat: 44.2, lon: 9.6 })
    expect(Array.isArray(route.coordinates)).toBe(true)
    expect(Array.isArray(route.instructions)).toBe(true)
  })

  it('chiama getDocument con parametri corretti', async () => {
    databases.getDocument.mockResolvedValue(createMockDocument())

    await routesService.getRoute('route-456')

    const call = databases.getDocument.mock.calls[0]
    expect(call[0]).toBeDefined() // DATABASE_ID
    expect(call[1]).toBe('routes') // COLLECTION_ID
    expect(call[2]).toBe('route-456') // routeId
  })

  it('gestisce errore durante il recupero', async () => {
    databases.getDocument.mockRejectedValue(new Error('Route not found'))

    const result = await routesService.getRoute('route-999')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Route not found')
  })
})

// ==========================================
// TEST UPDATE ROUTE NAME
// ==========================================

describe('updateRouteName - Aggiorna nome percorso', () => {
  it('aggiorna il nome con successo', async () => {
    const mockDoc = createMockDocument({ name: 'Nuovo Nome' })
    databases.updateDocument.mockResolvedValue(mockDoc)

    const result = await routesService.updateRouteName('route-123', 'Nuovo Nome')

    expect(result.success).toBe(true)
    expect(result.data.name).toBe('Nuovo Nome')
    expect(databases.updateDocument).toHaveBeenCalledTimes(1)
  })

  it('chiama updateDocument con parametri corretti', async () => {
    databases.updateDocument.mockResolvedValue(createMockDocument())

    await routesService.updateRouteName('route-123', 'Monte Rosa')

    const call = databases.updateDocument.mock.calls[0]
    expect(call[0]).toBeDefined() // DATABASE_ID
    expect(call[1]).toBe('routes') // COLLECTION_ID
    expect(call[2]).toBe('route-123') // routeId
    expect(call[3]).toEqual({ name: 'Monte Rosa' }) // update data
  })

  it('gestisce errore durante aggiornamento', async () => {
    databases.updateDocument.mockRejectedValue(new Error('Update failed'))

    const result = await routesService.updateRouteName('route-123', 'Nuovo Nome')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Update failed')
  })
})

// ==========================================
// TEST UPDATE ROUTE (GENERIC)
// ==========================================

describe('updateRoute - Aggiorna percorso generico', () => {
  it('aggiorna il percorso con dati generici', async () => {
    const mockDoc = createMockDocument({ distance: 15.5 })
    databases.updateDocument.mockResolvedValue(mockDoc)

    const result = await routesService.updateRoute('route-123', { distance: 15.5 })

    expect(result.success).toBe(true)
    expect(result.data.distance).toBe(15.5)
  })

  it('chiama updateDocument con dati custom', async () => {
    databases.updateDocument.mockResolvedValue(createMockDocument())

    const updateData = { 
      name: 'Aggiornato', 
      distance: 20,
      duration: 150
    }
    await routesService.updateRoute('route-123', updateData)

    const call = databases.updateDocument.mock.calls[0]
    expect(call[0]).toBeDefined() // DATABASE_ID
    expect(call[1]).toBe('routes') // COLLECTION_ID
    expect(call[2]).toBe('route-123') // routeId
    expect(call[3]).toEqual(updateData) // update data
  })

  it('gestisce errore durante aggiornamento', async () => {
    databases.updateDocument.mockRejectedValue(new Error('Database error'))

    const result = await routesService.updateRoute('route-123', { distance: 10 })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Database error')
  })
})

// ==========================================
// TEST COMPLETE ROUTE
// ==========================================

describe('completeRoute - Segna percorso come completato', () => {
  it('segna il percorso come completato', async () => {
    const mockRoute = createMockDocument()
    const mockCompleted = createMockDocument({ 
      status: 'completed',
      completedAt: '2024-01-15T12:00:00.000Z',
      actualDistance: 10.5,
      actualDuration: 120
    })

    databases.getDocument.mockResolvedValue(mockRoute)
    databases.updateDocument.mockResolvedValue(mockCompleted)

    const result = await routesService.completeRoute('route-123')

    expect(result.success).toBe(true)
    expect(result.data.status).toBe('completed')
    expect(databases.getDocument).toHaveBeenCalledTimes(1)
    expect(databases.updateDocument).toHaveBeenCalledTimes(1)
  })

  it('copia dati pianificati nei campi actual', async () => {
    const mockRoute = createMockDocument({
      distance: 12.5,
      duration: 135,
      ascent: 250,
      descent: 230
    })

    databases.getDocument.mockResolvedValue(mockRoute)
    databases.updateDocument.mockResolvedValue(mockRoute)

    await routesService.completeRoute('route-123')

    const updateCall = databases.updateDocument.mock.calls[0]
    const updateData = updateCall[3]

    expect(updateData.status).toBe('completed')
    expect(updateData.actualDistance).toBe(12.5)
    expect(updateData.actualDuration).toBe(135)
    expect(updateData.actualAscent).toBe(250)
    expect(updateData.actualDescent).toBe(230)
  })

  it('include timestamp completedAt', async () => {
    const mockRoute = createMockDocument()

    databases.getDocument.mockResolvedValue(mockRoute)
    databases.updateDocument.mockResolvedValue(mockRoute)

    await routesService.completeRoute('route-123')

    const updateData = databases.updateDocument.mock.calls[0][3]
    expect(updateData.completedAt).toBeDefined()
    expect(typeof updateData.completedAt).toBe('string')
  })

  it('gestisce ascent/descent null con fallback a 0', async () => {
    const mockRoute = createMockDocument({
      ascent: null,
      descent: null
    })

    databases.getDocument.mockResolvedValue(mockRoute)
    databases.updateDocument.mockResolvedValue(mockRoute)

    await routesService.completeRoute('route-123')

    const updateData = databases.updateDocument.mock.calls[0][3]
    expect(updateData.actualAscent).toBe(0)
    expect(updateData.actualDescent).toBe(0)
  })

  it('gestisce errore durante getRoute', async () => {
    databases.getDocument.mockRejectedValue(new Error('Route not found'))

    const result = await routesService.completeRoute('route-123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Route not found')
  })

  it('gestisce errore durante updateDocument', async () => {
    const mockRoute = createMockDocument()

    databases.getDocument.mockResolvedValue(mockRoute)
    databases.updateDocument.mockRejectedValue(new Error('Update failed'))

    const result = await routesService.completeRoute('route-123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Update failed')
  })
})

// ==========================================
// TEST DELETE ROUTE
// ==========================================

describe('deleteRoute - Elimina percorso', () => {
  it('elimina il percorso con successo', async () => {
    databases.deleteDocument.mockResolvedValue(undefined)

    const result = await routesService.deleteRoute('route-123')

    expect(result.success).toBe(true)
    expect(databases.deleteDocument).toHaveBeenCalledTimes(1)
  })

  it('chiama deleteDocument con parametri corretti', async () => {
    databases.deleteDocument.mockResolvedValue(undefined)

    await routesService.deleteRoute('route-456')

    const call = databases.deleteDocument.mock.calls[0]
    expect(call[0]).toBeDefined() // DATABASE_ID
    expect(call[1]).toBe('routes') // COLLECTION_ID
    expect(call[2]).toBe('route-456') // routeId
  })

  it('gestisce errore durante eliminazione', async () => {
    databases.deleteDocument.mockRejectedValue(new Error('Delete failed'))

    const result = await routesService.deleteRoute('route-123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Delete failed')
  })
})

// ==========================================
// TEST INTEGRAZIONE
// ==========================================

describe('routesService - Test integrazione', () => {
  it('workflow completo: crea, leggi, aggiorna, elimina', async () => {
    const routeData = createMockRouteData({ name: 'Integration Test' })
    const userId = 'user-123'
    const mockDoc = createMockDocument({ name: 'Integration Test' })

    // CREATE
    databases.createDocument.mockResolvedValue(mockDoc)
    const createResult = await routesService.saveRoute(routeData, userId)
    expect(createResult.success).toBe(true)

    // READ
    databases.getDocument.mockResolvedValue(mockDoc)
    const readResult = await routesService.getRoute(mockDoc.$id)
    expect(readResult.success).toBe(true)

    // UPDATE
    databases.updateDocument.mockResolvedValue({ ...mockDoc, name: 'Updated' })
    const updateResult = await routesService.updateRouteName(mockDoc.$id, 'Updated')
    expect(updateResult.success).toBe(true)

    // DELETE
    databases.deleteDocument.mockResolvedValue(undefined)
    const deleteResult = await routesService.deleteRoute(mockDoc.$id)
    expect(deleteResult.success).toBe(true)
  })

  it('workflow: salva route salvato, poi completa', async () => {
    const routeData = createMockRouteData()
    const userId = 'user-123'
    const mockSaved = createMockDocument({ status: 'saved' })
    const mockCompleted = createMockDocument({ status: 'completed' })

    // Salva come "saved"
    databases.createDocument.mockResolvedValue(mockSaved)
    const saveResult = await routesService.saveRoute(routeData, userId)
    expect(saveResult.success).toBe(true)

    // Completa
    databases.getDocument.mockResolvedValue(mockSaved)
    databases.updateDocument.mockResolvedValue(mockCompleted)
    const completeResult = await routesService.completeRoute(mockSaved.$id)
    expect(completeResult.success).toBe(true)
    expect(completeResult.data.status).toBe('completed')
  })

  it('workflow: recupera tutti, filtra salvati e completati', async () => {
    const mockAll = [
      createMockDocument({ $id: 'route-1', status: 'saved' }),
      createMockDocument({ $id: 'route-2', status: 'completed' }),
      createMockDocument({ $id: 'route-3', status: 'saved' })
    ]
    const mockSaved = mockAll.filter(r => r.status === 'saved')
    const mockCompleted = mockAll.filter(r => r.status === 'completed')

    // All
    databases.listDocuments.mockResolvedValueOnce({ documents: mockAll })
    const allResult = await routesService.getUserRoutes('user-123')
    expect(allResult.data).toHaveLength(3)

    // Saved only
    databases.listDocuments.mockResolvedValueOnce({ documents: mockSaved })
    const savedResult = await routesService.getSavedRoutes('user-123')
    expect(savedResult.data).toHaveLength(2)

    // Completed only
    databases.listDocuments.mockResolvedValueOnce({ documents: mockCompleted })
    const completedResult = await routesService.getCompletedRoutes('user-123')
    expect(completedResult.data).toHaveLength(1)
  })
})

// ==========================================
// TEST EDGE CASES
// ==========================================

describe('routesService - Edge cases', () => {
  it('gestisce route senza coordinates', async () => {
    const routeData = createMockRouteData()
    routeData.coordinates = []

    databases.createDocument.mockResolvedValue(createMockDocument())

    const result = await routesService.saveRoute(routeData, 'user-123')

    expect(result.success).toBe(true)
  })

  it('gestisce route senza instructions', async () => {
    const routeData = createMockRouteData()
    routeData.instructions = []

    databases.createDocument.mockResolvedValue(createMockDocument())

    const result = await routesService.saveRoute(routeData, 'user-123')

    expect(result.success).toBe(true)
  })

  it('gestisce valori distance molto grandi', async () => {
    const routeData = createMockRouteData({ distance: 100000 })

    databases.createDocument.mockResolvedValue(createMockDocument({ distance: 100000 }))

    const result = await routesService.saveRoute(routeData, 'user-123')

    expect(result.success).toBe(true)
  })

  it('gestisce userId molto lungo', async () => {
    const userId = 'a'.repeat(1000)
    const routeData = createMockRouteData()

    databases.createDocument.mockResolvedValue(createMockDocument({ userId }))

    const result = await routesService.saveRoute(routeData, userId)

    expect(result.success).toBe(true)
  })

  it('parseRouteDocument gestisce JSON malformato gracefully', async () => {
    const mockDoc = {
      ...createMockDocument(),
      coordinates: 'invalid json'
    }

    databases.getDocument.mockResolvedValue(mockDoc)

    // Il servizio gestisce l'errore internamente e ritorna success: false
    const result = await routesService.getRoute('route-123')
    
    // Dovrebbe ritornare errore invece di crashare
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})