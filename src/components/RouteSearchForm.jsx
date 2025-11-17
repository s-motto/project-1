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
  const [gettingLocation, setGettingLocation] = useState(false)//stato ottenimento posizione utente
  const [userLocation, setUserLocation] = useState(null)//posizione utente
  const [showTracking, setShowTracking] = useState(false) //mostra componente ActiveTracking
  const [showMapPointSelector, setShowMapPointSelector] = useState(false)//mostra selettore punti mappa
  const [selectedMapPoint, setSelectedMapPoint] = useState(null)//punto selezionato nella mappa
  const tempMarkerRef = useRef(null)//riferimento marcatore temporaneo
  
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
        if (routeLayer) map.removeLayer(routeLayer)
        if (startMarkerRef.current) startMarkerRef.current.remove()
        if (endMarkerRef.current) endMarkerRef.current.remove()
        if (updateMarkersListenerRef.current) {
          map.off('move zoom', updateMarkersListenerRef.current)
        }
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
  }, [location])
  
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
      }, [preloadedRoute, map])

      // useEffect per caricare percorsi hiking
    useEffect(() => {
      if (preloadedHike && map) {
        loadHikingRoute(preloadedHike)
      }
    }, [preloadedHike, map])

    // Gestione click sulla mappa per selezione punto
useEffect(() => {
  if (!map) return
  
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng
    
    // Mostra marker temporaneo pulsante
    if (tempMarkerRef.current) {
      tempMarkerRef.current.remove()
    }
    // Creo marcatore temporaneo
    const tempMarkerDiv = document.createElement('div')
    tempMarkerDiv.className = 'temp-map-marker fade-in-marker'
    tempMarkerDiv.style.position = 'absolute'
    tempMarkerDiv.style.zIndex = '1000'
    tempMarkerDiv.style.pointerEvents = 'none'
    tempMarkerDiv.innerHTML = ' '
    // Posiziono il marcatore
    const pixel = map.latLngToContainerPoint([lat, lng])
    tempMarkerDiv.style.left = `${pixel.x}px`
    tempMarkerDiv.style.top = `${pixel.y}px`
    tempMarkerDiv.style.transform = 'translate(-50%, -100%)'
    
    document.getElementById('map').appendChild(tempMarkerDiv)
    tempMarkerRef.current = tempMarkerDiv
    
    // Aggiorna posizione marcatore con movimenti mappa
    const updateTempMarker = () => {
      if (tempMarkerRef.current) {
        const newPixel = map.latLngToContainerPoint([lat, lng])
        tempMarkerRef.current.style.left = `${newPixel.x}px`
        tempMarkerRef.current.style.top = `${newPixel.y}px`
      }
    }
    map.on('move zoom', updateTempMarker)
    
    // Mostra loading toast
    toast.info('Ricerca indirizzo...')
    
    try {
      // Reverse geocoding usando il service
      const placeName = await reverseGeocode(lat, lng, ORS_KEY)
      
      if (placeName) {
        // Mostra modal di selezione
        setSelectedMapPoint({
          lat,
          lng,
          name: placeName
        })
        setShowMapPointSelector(true)
      } else {
        toast.error('Impossibile trovare l\'indirizzo')
        if (tempMarkerRef.current) tempMarkerRef.current.remove()
      }
    } catch (error) {
      logger.error('Reverse geocoding error:', error)
      toast.error('Errore nel recupero dell\'indirizzo')
      if (tempMarkerRef.current) tempMarkerRef.current.remove()
    }
  }
  
  map.on('click', handleMapClick)
  
  return () => {
    map.off('click', handleMapClick)
    if (tempMarkerRef.current) tempMarkerRef.current.remove()
  }
}, [map, ORS_KEY, toast])

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
  }, [debouncedStartText])

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
  }, [debouncedEndText])

      // Espongo la funzione di reset al componente genitore
      useImperativeHandle(ref, () => ({
      reset: handleReset
      }))

  // Funzione per caricare e visualizzare un percorso salvato
  const loadSavedRoute = (route) => {
    try {
      // Pulisco eventuali percorsi precedenti
      if (routeLayer && map) map.removeLayer(routeLayer)
      if (startMarkerRef.current) startMarkerRef.current.remove()
      if (endMarkerRef.current) endMarkerRef.current.remove()
      if (updateMarkersListenerRef.current && map) {
        map.off('move zoom', updateMarkersListenerRef.current)
      }

      // Imposto i punti di partenza e arrivo
      setStartPoint(route.startPoint)
      setEndPoint(route.endPoint)
      setStartText(route.startPoint.name || '')
      setEndText(route.endPoint.name || '')

      // Imposto le info del percorso
      setRouteInfo({
        distance: route.distance,
        duration: route.duration,
        ascent: route.ascent,
        descent: route.descent
      })

      // Imposto le istruzioni
      setInstructions(Array.isArray(route.instructions) ? route.instructions : [])


      // Creo il GeoJSON dal percorso salvato
      const geojson = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: route.coordinates
        },
        properties: {}
      }

      // Disegno il percorso sulla mappa
      const newRouteLayer = L.geoJSON(geojson, {
        style: { color: '#2563eb', weight: 4, opacity: 0.8 }
      }).addTo(map)
      setRouteLayer(newRouteLayer)

      // Creo marker di partenza e arrivo usando il factory
      startMarkerRef.current = createMapMarker(
        map,
        MarkerType.START,
        { lat: route.startPoint.lat, lng: route.startPoint.lon }
      )

      endMarkerRef.current = createMapMarker(
        map,
        MarkerType.END,
        { lat: route.endPoint.lat, lng: route.endPoint.lon }
      )

      // Creo listener per aggiornare posizioni marker
      updateMarkersListenerRef.current = createMarkersUpdateListener(
        map,
        [
          { marker: startMarkerRef.current, position: { lat: route.startPoint.lat, lng: route.startPoint.lon } },
          { marker: endMarkerRef.current, position: { lat: route.endPoint.lat, lng: route.endPoint.lon } }
        ]
      )
      map.on('move zoom', updateMarkersListenerRef.current)

      // Adatto la vista della mappa al percorso
      map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] })

      // Salvo i dati completi del percorso
      setFullRouteData(route)
  setIsPreloaded(true) //indico che il percorso è pre-caricato
      setRouteSaved(true) // this route was loaded from saved routes -> already saved

    } catch (error) {
      logger.error('Error loading saved route:', error)
      setErrorMsg('Errore nel caricamento del percorso salvato')
    }
  }

  // Funzione per caricare e visualizzare un percorso di hiking da Overpass con elevazione
const loadHikingRoute = (hike) => {
  try {
    logger.log('Loading hike with elevation data:', hike) // Debug
    
    // Pulisco eventuali percorsi precedenti
    if (routeLayer && map) map.removeLayer(routeLayer)
    if (startMarkerRef.current) startMarkerRef.current.remove()
    if (endMarkerRef.current) endMarkerRef.current.remove()
    if (updateMarkersListenerRef.current && map) {
      map.off('move zoom', updateMarkersListenerRef.current)
    }

    // Reset degli stati
    setStartPoint(null)
    setEndPoint(null)
    setStartText('')
    setEndText('')
    setInstructions([])
    setIsPreloaded(true)

    // Creo il GeoJSON dal percorso hiking
    const geojson = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: hike.coordinates
      },
      properties: {
        name: hike.name
      }
    }

    // Disegno il percorso sulla mappa
    const newRouteLayer = L.geoJSON(geojson, {
      style: { color: '#10b981', weight: 4, opacity: 0.8 }
    }).addTo(map)
    setRouteLayer(newRouteLayer)

    // Usa i dati di elevazione se disponibili, altrimenti calcola distanza
    let totalDistance = hike.length || 0
    
    // Se length non è presente, calcola dalla geometria
    if (!totalDistance) {
      for (let i = 0; i < hike.coordinates.length - 1; i++) {
        const [lon1, lat1] = hike.coordinates[i]
        const [lon2, lat2] = hike.coordinates[i + 1]
        totalDistance += calculateDistance(lat1, lon1, lat2, lon2)
      }
    }

    //  Usa ascent e descent da NearbyHikes se disponibili
    setRouteInfo({
      distance: parseFloat(totalDistance.toFixed(2)),
      duration: hike.duration || Math.round(totalDistance * 20), // Usa duration se disponibile, altrimenti stima
      ascent: hike.ascent || 0, 
      descent: hike.descent || 0 
    })

    // Marker di inizio e fine
    const startCoord = hike.coordinates[0]
    const endCoord = hike.coordinates[hike.coordinates.length - 1]

    // Creo marker usando il factory
    startMarkerRef.current = createMapMarker(
      map,
      MarkerType.START,
      { lat: startCoord[1], lng: startCoord[0] }
    )

    endMarkerRef.current = createMapMarker(
      map,
      MarkerType.END,
      { lat: endCoord[1], lng: endCoord[0] }
    )

    // Creo listener per aggiornare posizioni marker
    updateMarkersListenerRef.current = createMarkersUpdateListener(
      map,
      [
        { marker: startMarkerRef.current, position: { lat: startCoord[1], lng: startCoord[0] } },
        { marker: endMarkerRef.current, position: { lat: endCoord[1], lng: endCoord[0] } }
      ]
    )
    map.on('move zoom', updateMarkersListenerRef.current)

    // Adatto la vista della mappa al percorso
    map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] })

    // Salvo i dati completi del percorso per permettere il salvataggio
    const hikingFullData = {
      startPoint: { lat: startCoord[1], lon: startCoord[0], name: hike.name || 'Partenza' },
      endPoint: { lat: endCoord[1], lon: endCoord[0], name: hike.name ? `${hike.name} - Arrivo` : 'Arrivo' },
      distance: parseFloat(totalDistance.toFixed(2)),
      duration: hike.duration || Math.round(totalDistance * 20),
      ascent: hike.ascent || 0,
      descent: hike.descent || 0,
      coordinates: hike.coordinates,
      instructions: Array.isArray(hike.instructions) ? hike.instructions : []

    }

  setFullRouteData(hikingFullData)
  setRouteSaved(false) // hiking routes are not saved by default
  

  } catch (error) {
    logger.error('Error loading hiking route:', error)
    setErrorMsg('Errore nel caricamento del percorso di hiking')
  }
}


// Funzione per ottenere la posizione corrente dell'utente
const getCurrentLocation = () => {
  setGettingLocation(true)
  setErrorMsg('')
  
  if (!navigator.geolocation) {
    setErrorMsg('Il tuo browser non supporta la geolocalizzazione')
    setGettingLocation(false)
    return
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude
      const lon = position.coords.longitude
      
      // Centro la mappa sulla posizione dell'utente
      if (map) {
      map.setView([lat, lon], 13)
    }
      // Imposta le coordinate come punto di partenza
      setStartPoint({
        lat,
        lon,
        name: 'La tua posizione'
      })
      
      // Reverse geocoding per ottenere il nome del luogo usando il service
      try {
        const placeName = await reverseGeocode(lat, lon, ORS_KEY)
        
        if (placeName) {
          setStartText(`📍 ${placeName}`)
          setStartPoint({
            lat,
            lon,
            name: placeName
          })
        } else {
          setStartText('📍 La tua posizione')
        }
      } catch (error) {
        logger.error('Reverse geocoding error:', error)
        setStartText('📍 La tua posizione')
      }
      
      setGettingLocation(false)
      setUserLocation({ lat, lon })
    },
    (error) => {
      logger.error('Geolocation error:', error)
      switch(error.code) {
        case error.PERMISSION_DENIED:
          setErrorMsg('Permesso di geolocalizzazione negato')
          break
        case error.POSITION_UNAVAILABLE:
          setErrorMsg('Posizione non disponibile')
          break
        case error.TIMEOUT:
          setErrorMsg('Richiesta posizione scaduta')
          break
        default:
          setErrorMsg('Errore nel recupero della posizione')
      }
      setGettingLocation(false)
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )
}

//Resetto tutto il form e la mappa
const handleReset = () => {
  // Pulisco la mappa
  if (routeLayer && map) map.removeLayer(routeLayer)
  if (startMarkerRef.current) startMarkerRef.current.remove()
  if (endMarkerRef.current) endMarkerRef.current.remove()
  if (updateMarkersListenerRef.current && map) {
    map.off('move zoom', updateMarkersListenerRef.current)
  }
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

// Funzione per calcolare e visualizzare il percorso (REFACTORED con service)
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

  // Rimuovo layer e marker precedenti
  if (routeLayer && map) map.removeLayer(routeLayer)
  if (startMarkerRef.current) startMarkerRef.current.remove()
  if (endMarkerRef.current) endMarkerRef.current.remove()
  if (updateMarkersListenerRef.current && map) {
    map.off('move zoom', updateMarkersListenerRef.current)
  }

  // === NUOVO: Uso il service per calcolare il percorso ===
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

  // Handlers per MapPointSelector
const handleSetAsStart = () => {
  if (selectedMapPoint) {
    setStartPoint({
      lat: selectedMapPoint.lat,
      lon: selectedMapPoint.lng,
      name: selectedMapPoint.name
    })
    setStartText(selectedMapPoint.name)
    toast.success(' Punto di partenza impostato!')
  }
  setShowMapPointSelector(false)
  if (tempMarkerRef.current) tempMarkerRef.current.remove()
}
// Handler per impostare il punto selezionato come punto di arrivo
const handleSetAsEnd = () => {
  if (selectedMapPoint) {
    setEndPoint({
      lat: selectedMapPoint.lat,
      lon: selectedMapPoint.lng,
      name: selectedMapPoint.name
    })
    setEndText(selectedMapPoint.name)
    toast.success(' Punto di arrivo impostato!')
  }
  setShowMapPointSelector(false)
  if (tempMarkerRef.current) tempMarkerRef.current.remove()
}
// Handler per invertire i punti di partenza e arrivo
const handleSwapPoints = () => {
  if (startPoint && endPoint) {
    // Swap
    const temp = { ...startPoint }
    setStartPoint(endPoint)
    setEndPoint(temp)
    
    const tempText = startText
    setStartText(endText)
    setEndText(tempText)
    
    toast.success(' Punti invertiti!')
  }
  setShowMapPointSelector(false)
  if (tempMarkerRef.current) tempMarkerRef.current.remove()
}
// Handler per chiudere il selettore di punti sulla mappa senza fare modifiche
const handleCloseSelector = () => {
  setShowMapPointSelector(false)
  if (tempMarkerRef.current) tempMarkerRef.current.remove()
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
            onGetCurrentLocation={getCurrentLocation}
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

{/* Modal ActiveTracking */}
{showTracking && fullRouteData && (
  <ActiveTracking
    route={fullRouteData}
    onClose={handleCloseTracking}
    onComplete={handleTrackingComplete}
  />
)}

<div id="map" className="w-full h-[400px] rounded-lg shadow-md" />
    </div>
  )
})


export default RouteSearchForm