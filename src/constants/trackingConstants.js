// ==========================================
// TRACKING CONSTANTS
// ==========================================
// Costanti di configurazione per il tracking GPS e la gestione waypoints
// Centralizzate per facilitare manutenzione e tuning
// ==========================================

// ==========================================
// GPS TRACKING
// ==========================================

/**
 * Accuratezza GPS massima accettabile in metri
 * Valori tipici:
 * - < 10m: GPS eccellente (outdoor, cielo aperto)
 * - 10-30m: GPS buono (outdoor, qualche ostacolo)
 * - 30-100m: GPS accettabile (aree urbane)
 * - > 100m: GPS scarso (indoor, canyon urbani)
 * 
 * Default: 150m - permette tracking anche in condizioni non ideali
 */
export const DEFAULT_GPS_ACCURACY_MAX = 150

/**
 * Distanza minima tra punti GPS consecutivi in metri
 * Punti più vicini di questa soglia vengono ignorati per:
 * - Ridurre rumore GPS quando si è fermi
 * - Evitare accumulo di punti inutili
 * - Migliorare performance con meno punti da processare
 * 
 * Default: 3m - buon compromesso tra precisione e pulizia dati
 */
export const DEFAULT_MIN_POINT_DISTANCE_METERS = 3

/**
 * Timeout per acquisizione posizione GPS in millisecondi
 * Se il GPS non risponde entro questo tempo, viene generato un errore
 * 
 * Default: 10000ms (10 secondi)
 */
export const GPS_POSITION_TIMEOUT = 10000

/**
 * Età massima di una posizione GPS cachata in millisecondi
 * Posizioni più vecchie vengono scartate e ne viene richiesta una nuova
 * 
 * Default: 0 - sempre posizioni fresche (no cache)
 */
export const GPS_MAXIMUM_AGE = 0

// ==========================================
// WAYPOINTS
// ==========================================

/**
 * Numero massimo di waypoints che l'utente può aggiungere
 * Limitato per:
 * - Evitare percorsi troppo complessi
 * - Mantenere UI pulita
 * - Limitare chiamate API OpenRouteService
 * 
 * Default: 5 waypoints
 */
export const MAX_WAYPOINTS = 5

// ==========================================
// ELEVAZIONE
// ==========================================

/**
 * Numero massimo di coordinate da inviare all'API elevation
 * OpenRouteService ha un limite di 2000 coordinate
 * Usiamo 500 per sicurezza e performance
 * 
 * Default: 500 coordinate
 */
export const MAX_ELEVATION_COORDINATES = 500

// ==========================================
// UI / UX
// ==========================================

/**
 * Debounce time per input di ricerca in millisecondi
 * Ritardo prima di effettuare ricerca dopo che l'utente smette di digitare
 * 
 * Default: 300ms
 */
export const SEARCH_DEBOUNCE_MS = 300

/**
 * Zoom iniziale della mappa
 * 
 * Default: 13 - buon livello per vedere una città
 */
export const DEFAULT_MAP_ZOOM = 13

/**
 * Centro mappa di default (Milano)
 */
export const DEFAULT_MAP_CENTER = {
  lat: 45.4642,
  lon: 9.1900
}

// ==========================================
// CONVERSIONI
// ==========================================

/**
 * Fattore di conversione km → miglia
 */
export const KM_TO_MILES = 0.621371

/**
 * Fattore di conversione metri → piedi
 */
export const METERS_TO_FEET = 3.28084

// ==========================================
// API LIMITS
// ==========================================

/**
 * Raggio di ricerca default per sentieri vicini in km
 */
export const DEFAULT_NEARBY_RADIUS_KM = 10

/**
 * Raggi disponibili per ricerca sentieri vicini
 */
export const NEARBY_RADIUS_OPTIONS = [5, 10, 20, 50]

/**
 * Numero massimo di risultati per ricerca sentieri
 */
export const MAX_NEARBY_RESULTS = 20

/**
 * Lunghezza minima sentiero per essere incluso (km)
 */
export const MIN_TRAIL_LENGTH_KM = 1

/**
 * Lunghezza massima sentiero per essere incluso (km)
 */
export const MAX_TRAIL_LENGTH_KM = 80