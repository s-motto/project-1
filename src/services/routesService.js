import { databases } from '../appwrite'
import { ID, Query } from 'appwrite'

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
          createdAt: new Date().toISOString()
        }
      )
      return { success: true, data: document }
    } catch (error) {
      console.error('Error saving route:', error)
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
      console.error('Error fetching routes:', error)
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
      console.error('Error deleting route:', error)
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
      console.error('Error fetching route:', error)
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
      console.error('Error updating route:', error)
      return { success: false, error: error.message }
    }
  }
}

export default new RoutesService()