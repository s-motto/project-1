// ==========================================
// ROUTES SERVICE
// ==========================================
// Service per gestire i percorsi salvati su Appwrite
//
// Funzionalità:
// - Salvataggio percorsi (nuovi)
// - Recupero percorsi (tutti, salvati, completati, singolo)
// - Aggiornamento percorsi (nome, dati generici, completamento)
// - Eliminazione percorsi
//
// IMPORTANTE: Usa logger.error per tutti gli errori (NO console.error)
// ==========================================

import { databases } from '../appwrite'
import { ID, Query } from 'appwrite'
import logger from '../utils/logger'

// Configurazione database 
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'hiking_db'
const ROUTES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_ROUTES_COLLECTION_ID || 'routes'

class RoutesService {
  // ==========================================
  // HELPER: Parsa documenti Appwrite
  // ==========================================
  parseRouteDocument(doc) {
    return {
      ...doc,
      startPoint: JSON.parse(doc.startPoint),
      endPoint: JSON.parse(doc.endPoint),
      coordinates: JSON.parse(doc.coordinates),
      instructions: JSON.parse(doc.instructions),
      actualCoordinates: doc.actualCoordinates ? JSON.parse(doc.actualCoordinates) : undefined
    }
  }

  // ==========================================
  // CREATE: Salva nuovo percorso
  // ==========================================
  async saveRoute(routeData, userId) {
    try {
      const document = await databases.createDocument(
        DATABASE_ID,
        ROUTES_COLLECTION_ID,
        ID.unique(),
        {
          userId,
          name: routeData.name || 'Percorso senza nome',
          startPoint: JSON.stringify(routeData.startPoint),
          endPoint: JSON.stringify(routeData.endPoint),
          distance: routeData.distance,
          duration: routeData.duration,
          ascent: routeData.ascent,
          descent: routeData.descent,
          coordinates: JSON.stringify(routeData.coordinates),
          instructions: JSON.stringify(routeData.instructions),
          createdAt: new Date().toISOString(),
          status: routeData.status || 'saved', // 'saved', 'completed', 'emergency_save'
          
          // Campi opzionali per tracking completato o emergenza
          ...(routeData.completedAt && { completedAt: routeData.completedAt }),
          ...(routeData.actualDistance !== undefined && { actualDistance: routeData.actualDistance }),
          ...(routeData.actualDuration !== undefined && { actualDuration: routeData.actualDuration }),
          ...(routeData.actualAscent !== undefined && { actualAscent: routeData.actualAscent }),
          ...(routeData.actualDescent !== undefined && { actualDescent: routeData.actualDescent }),
          ...(routeData.actualCoordinates && { actualCoordinates: routeData.actualCoordinates }),
          ...(routeData.emergencySavedAt && { emergencySavedAt: routeData.emergencySavedAt })
        }
      )
      return { success: true, data: document }
    } catch (error) {
      logger.error('Error saving route:', error)
      return { success: false, error: error.message }
    }
  }

  // ==========================================
  // READ: Recupera tutti i percorsi di un utente
  // ==========================================
  async getUserRoutes(userId) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        ROUTES_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.orderDesc('createdAt'),
          Query.limit(100)
        ]
      )
      return {
        success: true,
        data: response.documents.map(doc => this.parseRouteDocument(doc))
      }
    } catch (error) {
      logger.error('Error fetching routes:', error)
      return { success: false, error: error.message }
    }
  }

  // ==========================================
  // READ: Recupera solo percorsi salvati (non completati)
  // ==========================================
  async getSavedRoutes(userId) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        ROUTES_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('status', 'saved'),
          Query.orderDesc('createdAt'),
          Query.limit(100)
        ]
      )
      return {
        success: true,
        data: response.documents.map(doc => this.parseRouteDocument(doc))
      }
    } catch (error) {
      logger.error('Error fetching saved routes:', error)
      return { success: false, error: error.message }
    }
  }

  // ==========================================
  // READ: Recupera solo percorsi completati
  // ==========================================
  async getCompletedRoutes(userId) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        ROUTES_COLLECTION_ID,
        [
          Query.equal('userId', userId),
          Query.equal('status', 'completed'),
          Query.orderDesc('completedAt'),
          Query.limit(100)
        ]
      )
      return {
        success: true,
        data: response.documents.map(doc => this.parseRouteDocument(doc))
      }
    } catch (error) {
      logger.error('Error fetching completed routes:', error)
      return { success: false, error: error.message }
    }
  }

  // ==========================================
  // READ: Recupera singolo percorso
  // ==========================================
  async getRoute(routeId) {
    try {
      const document = await databases.getDocument(
        DATABASE_ID,
        ROUTES_COLLECTION_ID,
        routeId
      )
      return {
        success: true,
        data: this.parseRouteDocument(document)
      }
    } catch (error) {
      logger.error('Error fetching route:', error)
      return { success: false, error: error.message }
    }
  }

  // ==========================================
  // UPDATE: Aggiorna nome percorso
  // ==========================================
  async updateRouteName(routeId, newName) {
    try {
      const document = await databases.updateDocument(
        DATABASE_ID,
        ROUTES_COLLECTION_ID,
        routeId,
        { name: newName }
      )
      return { success: true, data: document }
    } catch (error) {
      logger.error('Error updating route name:', error)
      return { success: false, error: error.message }
    }
  }

  // ==========================================
  // UPDATE: Aggiorna percorso (generico)
  // ==========================================
  async updateRoute(routeId, data) {
    try {
      const document = await databases.updateDocument(
        DATABASE_ID,
        ROUTES_COLLECTION_ID,
        routeId,
        data
      )
      return { success: true, data: document }
    } catch (error) {
      logger.error('Error updating route:', error)
      return { success: false, error: error.message }
    }
  }

  // ==========================================
  // UPDATE: Segna percorso come completato
  // Copia i dati pianificati nei campi "actual"
  // ==========================================
  async completeRoute(routeId) {
    try {
      // Recupera il percorso
      const routeResult = await this.getRoute(routeId)
      if (!routeResult.success) {
        return routeResult
      }

      const route = routeResult.data

      // Aggiorna con dati reali (copia pianificati se non ci sono dati tracking)
      const document = await databases.updateDocument(
        DATABASE_ID,
        ROUTES_COLLECTION_ID,
        routeId,
        {
          status: 'completed',
          completedAt: new Date().toISOString(),
          actualDistance: route.distance,
          actualDuration: route.duration,
          actualAscent: route.ascent || 0,
          actualDescent: route.descent || 0
        }
      )
      return { success: true, data: document }
    } catch (error) {
      logger.error('Error completing route:', error)
      return { success: false, error: error.message }
    }
  }

  // ==========================================
  // DELETE: Elimina percorso
  // ==========================================
  async deleteRoute(routeId) {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        ROUTES_COLLECTION_ID,
        routeId
      )
      return { success: true }
    } catch (error) {
      logger.error('Error deleting route:', error)
      return { success: false, error: error.message }
    }
  }
}

// Esporto singleton
export default new RoutesService()