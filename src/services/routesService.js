import { databases } from '../appwrite'
import { ID, Query } from 'appwrite'
import logger from '../utils/logger'

// Configurazione database 
const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'hiking_db'
const ROUTES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_ROUTES_COLLECTION_ID || 'routes'

class RoutesService {
  // Salva un nuovo percorso
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
          status: 'saved' // saved o completed
        }
      )
      return { success: true, data: document }
    } catch (error) {
      logger.error('Error saving route:', error)
      return { success: false, error: error.message }
    }
  }

  // Recupera tutti i percorsi di un utente
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
        data: response.documents.map(doc => ({
          ...doc,
          startPoint: JSON.parse(doc.startPoint),
          endPoint: JSON.parse(doc.endPoint),
          coordinates: JSON.parse(doc.coordinates),
          instructions: JSON.parse(doc.instructions)
        }))
      }
    } catch (error) {
      logger.error('Error fetching routes:', error)
      return { success: false, error: error.message }
    }
  }

  // Recupera solo i percorsi salvati
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
        data: response.documents.map(doc => ({
          ...doc,
          startPoint: JSON.parse(doc.startPoint),
          endPoint: JSON.parse(doc.endPoint),
          coordinates: JSON.parse(doc.coordinates),
          instructions: JSON.parse(doc.instructions)
        }))
      }
    } catch (error) {
      logger.error('Error fetching saved routes:', error)
      return { success: false, error: error.message }
    }
  }

  // Recupera solo i percorsi completati
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
        data: response.documents.map(doc => ({
          ...doc,
          startPoint: JSON.parse(doc.startPoint),
          endPoint: JSON.parse(doc.endPoint),
          coordinates: JSON.parse(doc.coordinates),
          instructions: JSON.parse(doc.instructions),
          actualCoordinates: doc.actualCoordinates ? JSON.parse(doc.actualCoordinates) : undefined
        }))
      }
    } catch (error) {
      logger.error('Error fetching completed routes:', error)
      return { success: false, error: error.message }
    }
  }

  // Elimina un percorso
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

  // Recupera un singolo percorso
  async getRoute(routeId) {
    try {
      const document = await databases.getDocument(
        DATABASE_ID,
        ROUTES_COLLECTION_ID,
        routeId
      )
      return { 
        success: true, 
        data: {
          ...document,
          startPoint: JSON.parse(document.startPoint),
          endPoint: JSON.parse(document.endPoint),
          coordinates: JSON.parse(document.coordinates),
          instructions: JSON.parse(document.instructions)
        }
      }
    } catch (error) {
      logger.error('Error fetching route:', error)
      return { success: false, error: error.message }
    }
  }

  // Aggiorna il nome di un percorso
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
      logger.error('Error updating route:', error)
      return { success: false, error: error.message }
    }
  }

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
    console.error('Error updating route:', error)
    return { success: false, error: error.message }
  }
}

    // Segna un percorso come completato
  async completeRoute(routeId) {
    try {
      // Recupera il percorso
      const routeResult = await this.getRoute(routeId)
      if (!routeResult.success) {
        return routeResult
      }
    
    const route = routeResult.data
    
    // Aggiorna con dati reali
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
}

export default new RoutesService()