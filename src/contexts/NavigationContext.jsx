import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
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
      return { ...state, isNavigating: true, error: null }
    case 'STOP':
      return { ...initialState }
    case 'POSITION':
      return { ...state, currentPosition: action.payload.position, heading: action.payload.heading || 0 }
    case 'ERROR':
      return { ...state, error: action.payload }
    default:
      return state
  }
}
// Provider per avvolgere l'app e fornire lo stato di navigazione
export function NavigationProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const geo = useGeolocation()

  // startNavigation starts the watch and flips state
  const startNavigation = useCallback(() => {
    if (state.isNavigating) return
    dispatch({ type: 'START' })
    const id = geo.start(
      (pos) => {
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp }
        dispatch({ type: 'POSITION', payload: { position, heading: pos.coords.heading || 0 } })
      },
      (err) => {
        dispatch({ type: 'ERROR', payload: err })
      }
    )
  }, [geo, state.isNavigating])

  const stopNavigation = useCallback(() => {
    try { geo.stop() } catch (e) { /* ignore */ }
    dispatch({ type: 'STOP' })
  }, [geo])

  // Cleanup on unmount to ensure watch is cleared
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
