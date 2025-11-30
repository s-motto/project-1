// ==========================================
// APPWRITE PROXY SERVICE
// ==========================================
// Proxy per chiamate API OpenRouteService tramite Appwrite Function
// Protegge la chiave API tenendola server-side
// ==========================================

import { Client, Functions } from 'appwrite'
import logger from '../utils/logger'

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID)

const functions = new Functions(client)

// ID della Function Appwrite per il proxy ORS
const FUNCTION_ID = import.meta.env.VITE_APPWRITE_FUNCTION_ID

/**
 * Chiama OpenRouteService API tramite Appwrite Function
 * 
 * @param {string} endpoint - Endpoint ORS (es. 'geocode/search')
 * @param {Object} body - Body della richiesta
 * @returns {Promise<Object>} Risposta API
 */
export async function callORS(endpoint, body) {
  // Verifica che FUNCTION_ID sia configurato
  if (!FUNCTION_ID) {
    const error = new Error('VITE_APPWRITE_FUNCTION_ID non configurato')
    logger.error('Appwrite Function ID mancante:', error)
    throw error
  }

  try {
    const execution = await functions.createExecution(
      FUNCTION_ID,
      JSON.stringify({ endpoint, body }),
      false, // async = false (aspetta la risposta)
      '/', // path
      'POST' // method
    )

    if (execution.status !== 'completed') {
      throw new Error(`Function execution failed: ${execution.status}`)
    }

    const response = JSON.parse(execution.responseBody)
    
    // Se la function ha restituito un errore
    if (response.error) {
      throw new Error(response.error)
    }

    return response
  } catch (error) {
    logger.error('Appwrite Function error:', error)
    throw error
  }
}