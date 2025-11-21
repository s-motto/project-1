// ==========================================
// APPWRITE PROXY SERVICE
// ==========================================
// Proxy per chiamate API OpenRouteService tramite Appwrite Function
// Protegge la chiave API tenendola server-side
// ==========================================

import { Client, Functions } from 'appwrite'

const client = new Client()
  .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID)

const functions = new Functions(client)

const FUNCTION_ID = '691cdcc00020e0854bb5'

/**
 * Chiama OpenRouteService API tramite Appwrite Function
 * 
 * @param {string} endpoint - Endpoint ORS (es. 'geocode/search')
 * @param {Object} body - Body della richiesta
 * @returns {Promise<Object>} Risposta API
 */
export async function callORS(endpoint, body) {
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
    console.error('Appwrite Function error:', error)
    throw error
  }
}