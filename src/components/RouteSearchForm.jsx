import TrackerErrorBoundary from './TrackerErrorBoundary'// importo il componente per la gestione degli errori
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react' // importo React e gli hook necessari
import { useLocation } from 'react-router-dom' // importo useLocation per leggere lo state della navigazione
import NavigationMode from './NavigationMode' // importo il componente NavigationMode
import SaveRouteButton from './SaveRouteButton' // importo il componente SaveRouteButton
import ActiveTracking from './ActiveTracking' // importo il componente ActiveTracking
import RouteInfo from './RouteInfo' // importo il componente RouteInfo
import RouteInstructions from './RouteInstructions' // importo il componente RouteInstructions
import RouteInputs from './RouteInputs' // importo il componente RouteInputs
import { FaLocationArrow } from 'react-icons/fa'  // importo l'icona necessaria
import L from 'leaflet' // importo Leaflet per la gestione della mappa
import 'leaflet/dist/leaflet.css' // importo stili di Leaflet
import MapPointSelector from './MapPointSelector' // importo il componente MapPointSelector
import useDebounce from '../hooks/useDebounce' // importo il custom hook per debounce
import { useRouteLoader } from '../hooks/useRouteLoader' // importo il custom hook per caricare percorsi
import { useMapClick } from '../hooks/useMapClick' // importo il custom hook per gestire click sulla mappa
import { useUserLocation } from '../hooks/useUserLocation' // importo il custom hook per geolocalizzazione
import { useMapPointHandlers } from '../hooks/useMapPointHandlers' // importo il custom hook per handler MapPointSelector
import { createMapMarker, createMarkersUpdateListener, MarkerType } from '../utils/mapMarkers' // importo il factory dei marker
import useNavigation from '../contexts/NavigationContext' // importo il contesto di navigazione
import { useToast } from '../contexts/ToastContext' // importo il contesto delle notifiche
import { useAuth } from '../contexts/AuthContext' // importo il contesto di autenticazione
import { calculateDistance, formatDistance, formatElevation, KM_TO_MI, M_TO_FT, formatDurationSeconds } from '../utils/gpsUtils'  // importo le funzioni di utilità GPS
import { useSettings } from '../contexts/SettingsContext' // importo il contesto delle impostazioni
import logger from '../utils/logger'  // importo il logger
import { geocodeText, fetchSuggestions, reverseGeocode } from '../services/geocodingService' // importo il service per geocoding
import { calculateRoute } from '../services/routeCalculationService' // importo il service per calcolo percorsi

// Componente RouteSearchForm per la ricerca e visualizzazione dei percorsi
const RouteSearchForm = forwardRef((props, ref) => {
  // Leggo lo state dalla navigazione React Router
  const location = useLocation()
  const [preloadedRoute, setPreloadedRoute] = useState(null) // percorso pre-caricato da navigazione
  const [preloadedHike, setPreloadedHike] = useState(null) // hike pre-caricato da navigazione
  
  const { settings } = useSettings()
  const [startPoint, setStartPoint] = useState(null) //latitudine e longitudine
  const [endPoint, setEndPoint] = useState(null) //latitudine e longitudine
  const [map, setMap] = useState(null) //istanza della mappa
  const [routeLayer, setRouteLayer] = useState(null) //layer del percorso
  const routeLayerRef = useRef(null) // ref per accedere a routeLayer nelle funzioni dell'hook
  const [startText, setStartText] = useState('') //testo input partenza
  const [endText, setEndText] = useState('') //testo input arrivo
  const debouncedStartText = useDebounce(startText, 300) //debounce per partenza
  const debouncedEndText = useDebounce(endText, 300) //debounce per arrivo
  const [loading, setLoading] = useState(false) //stato di caricamento
  const [errorMsg, setErrorMsg] = useState('') //messaggi di errore
  const [routeInfo, setRouteInfo] = useState(null) //info del percorso
  const [instructions, setInstructions] = useState([]) //istruzioni passo-passo
  const [startSuggestions, setStartSuggestions] = useState([]) //suggerimenti partenza
  const [endSuggestions, setEndSuggestions] = useState([]) //suggerimenti arrivo
  const [showStartDropdown, setShowStartDropdown] = useState(false) //mostra dropdown partenza
  const [showEndDropdown, setShowEndDropdown] = useState(false) //mostra dropdown arrivo
  const [startLoading, setStartLoading] = useState(false) //caricamento suggerimenti partenza
  const [endLoading, setEndLoading] = useState(false) //caricamento suggerimenti arrivo
  const ORS_KEY = import.meta.env.VITE_OPENROUTE_API_KEY || '' //chiave API OpenRouteService
  const startInputRef = useRef() //riferimento input partenza
  const endInputRef = useRef() //riferimento input arrivo
  const { toast } = useToast() //sistema di notifiche
  const { user } = useAuth() //dati utente
  

  const startMarkerRef = useRef(null) //marcatore partenza
  const endMarkerRef = useRef(null) //marcatore arrivo
  const updateMarkersListenerRef = useRef(null) // riferimento al listener
  

  const { isNavigating, currentPosition, heading, startNavigation, stopNavigation } = useNavigation() //stato di navigazione
  const [fullRouteData, setFullRouteData] = useState(null) // salva tutti i dati del percorso
  const [isPreloaded, setIsPreloaded] = useState(false) //indica se il percorso è pre-caricato
  const [routeSaved, setRouteSaved] = useState(false) //indica se l'utente ha già salvato il percorso
  const [showTracking, setShowTracking] = useState(false) //mostra componente ActiveTracking
  const [showMapPointSelector, setShowMapPointSelector] = useState(false)//mostra selettore punti mappa
  const [selectedMapPoint, setSelectedMapPoint] = useState(null)//punto selezionato nella mappa
  const removeTempMarkerRef = useRef(null)//funzione per rimuovere marker temporaneo

  // Sincronizzazione routeLayer state con ref per l'hook
  useEffect(() => {
    routeLayerRef.current = routeLayer
  }, [routeLayer])

  // Hook per caricare percorsi salvati e hiking
  const { loadSavedRoute, loadHikingRoute, cleanupPreviousRoute } = useRouteLoader(
    map,
    {
      routeLayerRef,
      startMarkerRef,
      endMarkerRef,
      updateMarkersListenerRef
    },
    {
      setStartPoint,
      setEndPoint,
      setStartText,
      setEndText,
      setRouteInfo,
      setInstructions,
      setFullRouteData,
      setIsPreloaded,
      setRouteSaved,
      setRouteLayer,
      setErrorMsg
    }
  )

  // Hook per gestire click sulla mappa
  useMapClick(map, ORS_KEY, toast, (pointData) => {
    // Callback chiamata quando un punto viene selezionato sulla mappa
    setSelectedMapPoint({
      lat: pointData.lat,
      lng: pointData.lng,
      name: pointData.name
    })
    // Salvo la funzione per rimuovere il marker temporaneo
    removeTempMarkerRef.current = pointData.removeTempMarker
    setShowMapPointSelector(true)
  })

  // Hook per geolocalizzazione utente
  const { getCurrentLocation, gettingLocation, userLocation, locationError } = useUserLocation(map, ORS_KEY)

  // Hook per handler MapPointSelector
  const { handleSetAsStart, handleSetAsEnd, handleSwapPoints, handleCloseSelector } = useMapPointHandlers({
    selectedMapPoint,
    startPoint,
    endPoint,
    startText,
    endText,
    setStartPoint,
    setEndPoint,
    setStartText,
    setEndText,
    setShowMapPointSelector,
    toast,
    removeTempMarkerRef
  })

  // Sincronizza errori di geolocalizzazione con errorMsg principale
  useEffect(() => {
    if (locationError) {
      setErrorMsg(locationError)
    }
  }, [locationError])
  
  // useEffect per leggere i dati passati tramite React Router state
  useEffect(() => {
    if (location.state?.preloadedRoute) {
      setPreloadedRoute(location.state.preloadedRoute)
    } else if (location.state?.preloadedHike) {
      setPreloadedHike(location.state.preloadedHike)
    } else if (location.pathname === '/' && !location.state) {
      // Click su Home senza state -> reset del form
      setPreloadedRoute(null)
      setPreloadedHike(null)
      // Resetto anche lo stato del form chiamando la logica di reset
      if (map) {
        cleanupPreviousRoute()
        map.setView([45.4642, 9.1900], 13)
      }
      try { stopNavigation() } catch (err) { /* ignore */ }
      setStartPoint(null)
      setEndPoint(null)
      setStartText('')
      setEndText('')
      setRouteLayer(null)
      setRouteInfo(null)
      setInstructions([])
      setFullRouteData(null)
      setRouteSaved(false)
      setIsPreloaded(false)
      setErrorMsg('')
    }
  }, [location, map, cleanupPreviousRoute, stopNavigation])
  
    useEffect(() => {
      const mapInstance = L.map('map').setView([45.4642, 9.1900], 13) //Centro su Milano di default
      
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: ' OpenStreetMap contributors'
      }).addTo(mapInstance)
      
      setMap(mapInstance) //Salva l'istanza della mappa nello stato

      return () => {
        //quando il componente viene smontato, rimuovi la mappa
        if (mapInstance) {
          mapInstance.remove()
        }
      }
    }, [])

      // useEffect per caricare percorsi salvati
      useEffect(() => {
        if (preloadedRoute && map) {
          loadSavedRoute(preloadedRoute)
        }
      }, [preloadedRoute, map, loadSavedRoute])

      // useEffect per caricare percorsi hiking
    useEffect(() => {
      if (preloadedHike && map) {
        loadHikingRoute(preloadedHike)
      }
    }, [preloadedHike, map, loadHikingRoute])

// useEffect per autocomplete partenza con debounce
  useEffect(() => {
    const fetchStartSuggestions = async () => {
      if (debouncedStartText && debouncedStartText.length > 1) {
        setStartLoading(true)
        const suggestions = await fetchSuggestions(debouncedStartText, ORS_KEY)
        setStartSuggestions(suggestions)
        setStartLoading(false)
      } else {
        setStartSuggestions([])
      }
    }
    fetchStartSuggestions()
  }, [debouncedStartText, ORS_KEY])

  // useEffect per autocomplete arrivo con debounce
  useEffect(() => {
    const fetchEndSuggestions = async () => {
      if (debouncedEndText && debouncedEndText.length > 1) {
        setEndLoading(true)
        const suggestions = await fetchSuggestions(debouncedEndText, ORS_KEY)
        setEndSuggestions(suggestions)
        setEndLoading(false)
      } else {
        setEndSuggestions([])
      }
    }
    fetchEndSuggestions()
  }, [debouncedEndText, ORS_KEY])

      // Espongo la funzione di reset al componente genitore
      useImperativeHandle(ref, () => ({
      reset: handleReset
      }))

// Handler per ottenere posizione corrente (usa l'hook)
const handleGetCurrentLocation = () => {
  getCurrentLocation(
    // Callback success
    (locationData) => {
      setStartPoint({
        lat: locationData.lat,
        lon: locationData.lon,
        name: locationData.name
      })
      setStartText(locationData.displayText)
    },
    // Callback error
    (error) => {
      setErrorMsg(error)
    }
  )
}

//Resetto tutto il form e la mappa
const handleReset = () => {
  // Pulisco la mappa usando la funzione dell'hook
  cleanupPreviousRoute()
  
  // Ensure navigation is stopped and geolocation watch is cleared via context
  try { stopNavigation() } catch (err) { /* ignore */ }
  
  // Reset degli stati
  setStartPoint(null)
  setEndPoint(null)
  setStartText('')
  setEndText('')
  setRouteLayer(null)
  setRouteInfo(null)
  setInstructions([])
  setFullRouteData(null)
  setRouteSaved(false)
  setIsPreloaded(false)
  setErrorMsg('')

  // Resetto la vista della mappa
  if (map) {
    map.setView([45.4642, 9.1900], 13)
  }
}

// ========== CALLBACK FUNCTIONS PER ROUTEINPUTS ==========

// Gestione cambio testo input partenza
const handleStartTextChange = (e) => {
  const val = e.target.value
  setStartText(val)
  setStartPoint(null)
  if (val.length > 1) {
    setShowStartDropdown(true)
  } else {
    setShowStartDropdown(false)
  }
}

// Gestione cambio testo input arrivo
const handleEndTextChange = (e) => {
  const val = e.target.value
  setEndText(val)
  setEndPoint(null)
  if (val.length > 1) {
    setShowEndDropdown(true)
  } else {
    setShowEndDropdown(false)
  }
}

// Gestione focus/blur input partenza
const handleStartFocus = () => {
  if (startText.length > 1) setShowStartDropdown(true)
}

const handleStartBlur = () => {
  setTimeout(() => setShowStartDropdown(false), 150)
}

// Gestione focus/blur input arrivo
const handleEndFocus = () => {
  if (endText.length > 1) setShowEndDropdown(true)
}

const handleEndBlur = () => {
  setTimeout(() => setShowEndDropdown(false), 150)
}

// Handler selezione suggerimenti
const handleSelectStartSuggestion = (suggestion) => {
  setStartText(suggestion.display_name)
  setStartPoint({
    lat: suggestion.lat,
    lon: suggestion.lon,
    name: suggestion.display_name,
  })
  setShowStartDropdown(false)
  setStartSuggestions([])
  startInputRef.current.blur()
}

const handleSelectEndSuggestion = (suggestion) => {
  setEndText(suggestion.display_name)
  setEndPoint({
    lat: suggestion.lat,
    lon: suggestion.lon,
    name: suggestion.display_name,
  })
  setShowEndDropdown(false)
  setEndSuggestions([])
  endInputRef.current.blur()
}

// ========== FINE CALLBACK FUNCTIONS ==========

// Funzione per calcolare e visualizzare il percorso
const handleSubmit = async (e) => {
  e.preventDefault()
  setErrorMsg('')
  setLoading(true)
  setRouteInfo(null)
  setInstructions([])
  setFullRouteData(null)
  setIsPreloaded(false)

  // Ottengo coordinate se non già fornite
  let sp = startPoint
  let ep = endPoint

  // Geocodifico se necessario il punto di partenza
  if (!sp && startText) {
    sp = await geocodeText(startText, ORS_KEY)
    if (sp) setStartPoint(sp)
  }
  // Geocodifico se necessario il punto di arrivo
  if (!ep && endText) {
    ep = await geocodeText(endText, ORS_KEY)
    if (ep) setEndPoint(ep)
  }
  // Controllo che entrambi i punti siano disponibili
  if (!sp || !ep) {
    setLoading(false)
    setErrorMsg('Per favore inserisci sia il punto di partenza che quello di arrivo.')
    return
  }

  // Pulisco layer e marker precedenti usando la funzione dell'hook
  cleanupPreviousRoute()

  // Uso il service per calcolare il percorso
  const result = await calculateRoute({
    start: sp,
    end: ep,
    apiKey: ORS_KEY,
    language: 'it',
    units: 'km'
  })

  // Gestione errore dal service
  if (!result.success) {
    setErrorMsg(result.error || 'Errore nel calcolo del percorso')
    setLoading(false)
    return
  }

  // Uso i dati già formattati dal service
  const routeData = result.data

  // Disegno il percorso sulla mappa usando il GeoJSON fornito dal service
  const newRouteLayer = L.geoJSON(routeData.geojson, {
    style: { color: '#2563eb', weight: 4, opacity: 0.8 }
  }).addTo(map)
  setRouteLayer(newRouteLayer)

  // Creo marker usando il factory
  startMarkerRef.current = createMapMarker(
    map,
    MarkerType.START,
    { lat: sp.lat, lng: sp.lon }
  )

  endMarkerRef.current = createMapMarker(
    map,
    MarkerType.END,
    { lat: ep.lat, lng: ep.lon }
  )

  // Creo listener per aggiornare posizioni marker
  updateMarkersListenerRef.current = createMarkersUpdateListener(
    map,
    [
      { marker: startMarkerRef.current, position: { lat: sp.lat, lng: sp.lon } },
      { marker: endMarkerRef.current, position: { lat: ep.lat, lng: ep.lon } }
    ]
  )
  map.on('move zoom', updateMarkersListenerRef.current)
  
  // Adatto la vista della mappa al percorso
  map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] })

  // Imposto le info del percorso (già formattate dal service)
  setRouteInfo({
    distance: routeData.distance,
    duration: routeData.duration,
    ascent: routeData.ascent,
    descent: routeData.descent
  })

  // Imposto le istruzioni (già estratte dal service)
  setInstructions(routeData.instructions)

  // Salvo tutti i dati del percorso
  setFullRouteData(routeData)
  setRouteSaved(false)
  setLoading(false)
}


  // Handlers per Tracking
 const handleStartTracking = () => {
  // Controlla se l'utente è loggato
  if (!user) {
    toast.warning('Devi effettuare il login per usare il tracking GPS con statistiche')
    return
  }
  setShowTracking(true)
}

  const handleCloseTracking = () => {
    setShowTracking(false)
  }

  const handleTrackingComplete = () => {
    setShowTracking(false)
    // Opzionalmente ricarica o aggiorna qualcosa
  }

  return (
    <div className="flex flex-col space-y-4">
  {!isNavigating ? (
        <>
          {/* Form di ricerca percorso */}
          <RouteInputs
            startText={startText}
            endText={endText}
            startSuggestions={startSuggestions}
            endSuggestions={endSuggestions}
            startLoading={startLoading}
            endLoading={endLoading}
            showStartDropdown={showStartDropdown}
            showEndDropdown={showEndDropdown}
            isPreloaded={isPreloaded}
            gettingLocation={gettingLocation}
            loading={loading}
            errorMsg={errorMsg}
            startInputRef={startInputRef}
            endInputRef={endInputRef}
            onStartTextChange={handleStartTextChange}
            onEndTextChange={handleEndTextChange}
            onStartFocus={handleStartFocus}
            onStartBlur={handleStartBlur}
            onEndFocus={handleEndFocus}
            onEndBlur={handleEndBlur}
            onSelectStartSuggestion={handleSelectStartSuggestion}
            onSelectEndSuggestion={handleSelectEndSuggestion}
            onGetCurrentLocation={handleGetCurrentLocation}
            onSubmit={handleSubmit}
          />

{/* Modal Selezione Punto Mappa */}
{showMapPointSelector && selectedMapPoint && (
  <MapPointSelector
    location={selectedMapPoint}
    onSetStart={handleSetAsStart}
    onSetEnd={handleSetAsEnd}
    onSwap={startPoint && endPoint ? handleSwapPoints : null}
    onClose={handleCloseSelector}
  />
)}
          {/* Indicatore visuale gps */}
{userLocation && startPoint && startPoint.lat === userLocation.lat && (
  <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 rounded-lg text-sm text-green-700">
    <FaLocationArrow className="text-green-600" />
    <span>Partenza impostata sulla tua posizione attuale</span>
  </div>
)}

          {/* Route Information Card */}
          {routeInfo && (
            <RouteInfo
              routeInfo={routeInfo}
              fullRouteData={fullRouteData}
              isPreloaded={isPreloaded}
              preloadedHike={preloadedHike}
              routeSaved={routeSaved}
              onSaved={(savedId) => {
                setRouteSaved(true)
                if (savedId) {
                  setFullRouteData((prev) => ({ ...(prev || {}), savedId }))
                }
              }}
              onStartTracking={handleStartTracking}
              onStartNavigation={() => startNavigation()}
            />
          )}


          {/* Turn-by-turn Instructions */}
          <RouteInstructions instructions={instructions} />
        </>
      ) : (
  <NavigationMode
    map={map}
    routeLayer={routeLayer}
    instructions={instructions}
    endPoint={endPoint}
    currentPosition={currentPosition}
    heading={heading}
    onStop={() => stopNavigation()}
  />
)}

{/* Modal ActiveTracking con Error Boundary */}
{showTracking && fullRouteData && (
  <TrackerErrorBoundary
    user={user}
    route={fullRouteData}
    trackingData={{
      trackPoints: [],
      distance: 0,
      elapsedTime: 0,
      elevationGain: 0,
      elevationLoss: 0
    }}
    onGoHome={() => {
      setShowTracking(false)
    }}
  >
    <ActiveTracking
      route={fullRouteData}
      onClose={handleCloseTracking}
      onComplete={handleTrackingComplete}
    />
  </TrackerErrorBoundary>
)}

<div id="map" className="w-full h-[400px] rounded-lg shadow-md" />
    </div>
  )
})


export default RouteSearchForm