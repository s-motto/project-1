import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react'
import useGeolocation from '../hooks/useGeolocation'
// Contesto per gestire lo stato di navigazione globale
const NavigationStateContext = createContext(null)
const NavigationDispatchContext = createContext(null)
// Stato iniziale della navigazione
const initialState = {
  isNavigating: false,
  currentPosition: null,
  heading: 0,
  error: null
}
// Riduttore per gestire le azioni di navigazione
function reducer(state, action) {
  switch (action.type) {
    case 'START':
      return { ...state, isNavigating: true, error: null } // reset error on start
    case 'STOP':
      return { ...initialState } // reset state on stop
    case 'POSITION':
      return { ...state, currentPosition: action.payload.position, heading: action.payload.heading || 0 } // update position and heading
    case 'ERROR':
      return { ...state, error: action.payload } // set error
    default:
      return state
  }
}
// Provider per avvolgere l'app e fornire lo stato di navigazione
export function NavigationProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const geo = useGeolocation()
  const isNavigatingRef = useRef(false)

  // Funzione per avviare la navigazione
  const startNavigation = useCallback(() => {
    if (isNavigatingRef.current) return // Usa ref invece di state per evitare stale closure
    isNavigatingRef.current = true
    dispatch({ type: 'START' })
    const id = geo.start(
      (pos) => {
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp }
        dispatch({ type: 'POSITION', payload: { position, heading: pos.coords.heading || 0 } }) // posizione e orientamento
      },
      (err) => {
        dispatch({ type: 'ERROR', payload: err }) // errore di geolocalizzazione
      }
    )
  }, [geo])
  // Funzione per fermare la navigazione
  const stopNavigation = useCallback(() => {
    isNavigatingRef.current = false
    try { geo.stop() } catch (e) { /* ignore */ }
    dispatch({ type: 'STOP' })
  }, [geo])

  // Pulizia alla rimozione del componente
  useEffect(() => {
    return () => {
      try { geo.stop() } catch (e) { /* ignore */ }
    }
  }, [geo])

  return (
    <NavigationStateContext.Provider value={state}>
      <NavigationDispatchContext.Provider value={{ startNavigation, stopNavigation }}>
        {children}
      </NavigationDispatchContext.Provider>
    </NavigationStateContext.Provider>
  )
}
// Hook personalizzati per accedere allo stato e alle azioni di navigazione
export function useNavigationState() {
  const ctx = useContext(NavigationStateContext)
  if (ctx === null) throw new Error('useNavigationState must be used within NavigationProvider')
  return ctx
}
// Hook per accedere alle azioni di navigazione
export function useNavigationDispatch() {
  const ctx = useContext(NavigationDispatchContext)
  if (ctx === null) throw new Error('useNavigationDispatch must be used within NavigationProvider')
  return ctx
}
// Hook combinato per accedere sia allo stato che alle azioni di navigazione
export default function useNavigation() {
  return { ...useNavigationState(), ...useNavigationDispatch() }
}
