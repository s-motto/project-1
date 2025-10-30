import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react'
import useGeolocation from '../hooks/useGeolocation'

const NavigationStateContext = createContext(null)
const NavigationDispatchContext = createContext(null)

const initialState = {
  isNavigating: false,
  currentPosition: null,
  heading: 0,
  error: null
}

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

export function NavigationProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const geo = useGeolocation()

  // startNavigation starts the watch and flips state
  const startNavigation = useCallback(() => {
    console.log('[NavigationContext] startNavigation called, currently isNavigating=', state.isNavigating)
    if (state.isNavigating) return
    dispatch({ type: 'START' })
    const id = geo.start(
      (pos) => {
        console.log('[NavigationContext] received position', pos && pos.coords ? { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy, heading: pos.coords.heading } : pos)
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp }
        dispatch({ type: 'POSITION', payload: { position, heading: pos.coords.heading || 0 } })
      },
      (err) => {
        console.error('[NavigationContext] geolocation error', err)
        dispatch({ type: 'ERROR', payload: err })
      }
    )
    console.log('[NavigationContext] geo.start returned id', id)
  }, [geo, state.isNavigating])

  const stopNavigation = useCallback(() => {
    console.log('[NavigationContext] stopNavigation called')
    try { geo.stop() } catch (e) { console.warn('[NavigationContext] error on geo.stop', e) }
    dispatch({ type: 'STOP' })
  }, [geo])

  // Cleanup on unmount to ensure watch is cleared
  useEffect(() => {
    return () => {
      console.log('[NavigationContext] cleanup on unmount, stopping geo')
      try { geo.stop() } catch (e) { console.warn('[NavigationContext] error on cleanup geo.stop', e) }
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

export function useNavigationState() {
  const ctx = useContext(NavigationStateContext)
  if (ctx === null) throw new Error('useNavigationState must be used within NavigationProvider')
  return ctx
}

export function useNavigationDispatch() {
  const ctx = useContext(NavigationDispatchContext)
  if (ctx === null) throw new Error('useNavigationDispatch must be used within NavigationProvider')
  return ctx
}

export default function useNavigation() {
  return { ...useNavigationState(), ...useNavigationDispatch() }
}
