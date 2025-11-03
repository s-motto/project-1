import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import NavigationMode from './NavigationMode'
import SaveRouteButton from './SaveRouteButton'
import ActiveTracking from './ActiveTracking'
import { FaMapMarkerAlt, FaFlag, FaWalking, FaClock, FaRoute, FaLocationArrow, FaSpinner, FaPlay } from 'react-icons/fa'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import useNavigation from '../contexts/NavigationContext'

const RouteSearchForm = forwardRef(({preloadedRoute, preloadedHike}, ref) => {
  const [startPoint, setStartPoint] = useState(null) //latitudine e longitudine
  const [endPoint, setEndPoint] = useState(null) //latitudine e longitudine
  const [map, setMap] = useState(null) //istanza della mappa
  const [routeLayer, setRouteLayer] = useState(null) //layer del percorso
  const [startText, setStartText] = useState('') //testo input partenza
  const [endText, setEndText] = useState('') //testo input arrivo
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
  
 
  const startMarkerRef = useRef(null) //marcatore partenza
  const endMarkerRef = useRef(null) //marcatore arrivo
  const updateMarkersListenerRef = useRef(null) // riferimento al listener
  
  // Navigation state and actions come dal NavigationContext
  const { isNavigating, currentPosition, heading, startNavigation, stopNavigation } = useNavigation()
  const [fullRouteData, setFullRouteData] = useState(null) // salva tutti i dati del percorso
  const [isPreloaded, setIsPreloaded] = useState(false) //indica se il percorso è pre-caricato
  const [routeSaved, setRouteSaved] = useState(false) //indica se l'utente ha già salvato il percorso
  const [gettingLocation, setGettingLocation] = useState(false)//stato ottenimento posizione utente
  const [userLocation, setUserLocation] = useState(null)//posizione utente
  const [showTracking, setShowTracking] = useState(false) //mostra componente ActiveTracking
    useEffect(() => {
      const mapInstance = L.map('map').setView([45.4642, 9.1900], 13) //Centro su Milano di default
      
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
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
      setInstructions(route.instructions || [])

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

      // Creo il marker di partenza
      const startMarkerDiv = document.createElement('div')
      startMarkerDiv.className = 'custom-html-marker start-marker'
      startMarkerDiv.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="32" height="32" fill="#10b981" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
        </svg>
      `
      const startPointPixel = map.latLngToContainerPoint([route.startPoint.lat, route.startPoint.lon])
      startMarkerDiv.style.position = 'absolute'
      startMarkerDiv.style.left = `${startPointPixel.x}px`
      startMarkerDiv.style.top = `${startPointPixel.y}px`
      startMarkerDiv.style.transform = 'translate(-50%, -100%)'
      startMarkerDiv.style.zIndex = '400'
      startMarkerDiv.style.pointerEvents = 'none'
      document.getElementById('map').appendChild(startMarkerDiv)
      startMarkerRef.current = startMarkerDiv

      // Creo il marker di arrivo
      const endMarkerDiv = document.createElement('div')
      endMarkerDiv.className = 'custom-html-marker end-marker'
      endMarkerDiv.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="32" height="32" fill="#ef4444" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
          <path d="M32 0C49.7 0 64 14.3 64 32V48l69-17.2c38.1-9.5 78.3-5.1 113.5 12.5c46.3 23.2 100.8 23.2 147.1 0l9.6-4.8C423.8 28.1 448 43.1 448 66.1V345.8c0 13.3-8.3 25.3-20.8 30l-34.7 13c-46.2 17.3-97.6 14.6-141.7-7.4c-37.9-19-81.3-23.7-122.5-13.4L64 384v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V400 334 64 32C0 14.3 14.3 0 32 0zM64 187.1l64-13.9v65.5L64 252.6V187.1zm0 96.8l64-13.9v65.5L64 349.4V283.9zM320 128c-13.3 0-24 10.7-24 24s10.7 24 24 24h32c13.3 0 24-10.7 24-24s-10.7-24-24-24H320z"/>
        </svg>
      `
      const endPointPixel = map.latLngToContainerPoint([route.endPoint.lat, route.endPoint.lon])
      endMarkerDiv.style.position = 'absolute'
      endMarkerDiv.style.left = `${endPointPixel.x}px`
      endMarkerDiv.style.top = `${endPointPixel.y}px`
      endMarkerDiv.style.transform = 'translate(-50%, -100%)'
      endMarkerDiv.style.zIndex = '400'
      endMarkerDiv.style.pointerEvents = 'none'
      document.getElementById('map').appendChild(endMarkerDiv)
      endMarkerRef.current = endMarkerDiv

      // Funzione per aggiornare la posizione del marker
      const updateMarkerPositions = () => {
        if (startMarkerRef.current) {
          const newStartPoint = map.latLngToContainerPoint([route.startPoint.lat, route.startPoint.lon])
          startMarkerRef.current.style.left = `${newStartPoint.x}px`
          startMarkerRef.current.style.top = `${newStartPoint.y}px`
        }
        if (endMarkerRef.current) {
          const newEndPoint = map.latLngToContainerPoint([route.endPoint.lat, route.endPoint.lon])
          endMarkerRef.current.style.left = `${newEndPoint.x}px`
          endMarkerRef.current.style.top = `${newEndPoint.y}px`
        }
      }

      updateMarkersListenerRef.current = updateMarkerPositions
      map.on('move zoom', updateMarkerPositions)

      // Adatto la vista della mappa al percorso
      map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] })

      // Salvo i dati completi del percorso
      setFullRouteData(route)
  setIsPreloaded(true) //indico che il percorso è pre-caricato
  setRouteSaved(true) // this route was loaded from saved routes -> already saved

    } catch (error) {
      console.error('Error loading saved route:', error)
      setErrorMsg('Errore nel caricamento del percorso salvato')
    }
  }

  // Funzione per caricare e visualizzare un percorso di hiking da Overpass con elevazione
const loadHikingRoute = (hike) => {
  try {
    console.log('Loading hike with elevation data:', hike) // Debug
    
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

    // Marker di inizio (primo punto)
    const startCoord = hike.coordinates[0]
    const startMarkerDiv = document.createElement('div')
    startMarkerDiv.className = 'custom-html-marker start-marker'
    startMarkerDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="32" height="32" fill="#10b981" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
      </svg>
    `
    const startPointPixel = map.latLngToContainerPoint([startCoord[1], startCoord[0]])
    startMarkerDiv.style.position = 'absolute'
    startMarkerDiv.style.left = `${startPointPixel.x}px`
    startMarkerDiv.style.top = `${startPointPixel.y}px`
    startMarkerDiv.style.transform = 'translate(-50%, -100%)'
    startMarkerDiv.style.zIndex = '400'
    startMarkerDiv.style.pointerEvents = 'none'
    document.getElementById('map').appendChild(startMarkerDiv)
    startMarkerRef.current = startMarkerDiv

    // Marker di fine (ultimo punto)
    const endCoord = hike.coordinates[hike.coordinates.length - 1]
    const endMarkerDiv = document.createElement('div')
    endMarkerDiv.className = 'custom-html-marker end-marker'
    endMarkerDiv.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="32" height="32" fill="#ef4444" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M32 0C49.7 0 64 14.3 64 32V48l69-17.2c38.1-9.5 78.3-5.1 113.5 12.5c46.3 23.2 100.8 23.2 147.1 0l9.6-4.8C423.8 28.1 448 43.1 448 66.1V345.8c0 13.3-8.3 25.3-20.8 30l-34.7 13c-46.2 17.3-97.6 14.6-141.7-7.4c-37.9-19-81.3-23.7-122.5-13.4L64 384v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V400 334 64 32C0 14.3 14.3 0 32 0zM64 187.1l64-13.9v65.5L64 252.6V187.1zm0 96.8l64-13.9v65.5L64 349.4V283.9zM320 128c-13.3 0-24 10.7-24 24s10.7 24 24 24h32c13.3 0 24-10.7 24-24s-10.7-24-24-24H320z"/>
      </svg>
    `
    const endPointPixel = map.latLngToContainerPoint([endCoord[1], endCoord[0]])
    endMarkerDiv.style.position = 'absolute'
    endMarkerDiv.style.left = `${endPointPixel.x}px`
    endMarkerDiv.style.top = `${endPointPixel.y}px`
    endMarkerDiv.style.transform = 'translate(-50%, -100%)'
    endMarkerDiv.style.zIndex = '400'
    endMarkerDiv.style.pointerEvents = 'none'
    document.getElementById('map').appendChild(endMarkerDiv)
    endMarkerRef.current = endMarkerDiv

    // Funzione per aggiornare la posizione dei marker
    const updateMarkerPositions = () => {
      if (startMarkerRef.current) {
        const newStartPoint = map.latLngToContainerPoint([startCoord[1], startCoord[0]])
        startMarkerRef.current.style.left = `${newStartPoint.x}px`
        startMarkerRef.current.style.top = `${newStartPoint.y}px`
      }
      if (endMarkerRef.current) {
        const newEndPoint = map.latLngToContainerPoint([endCoord[1], endCoord[0]])
        endMarkerRef.current.style.left = `${newEndPoint.x}px`
        endMarkerRef.current.style.top = `${newEndPoint.y}px`
      }
    }

    updateMarkersListenerRef.current = updateMarkerPositions
    map.on('move zoom', updateMarkerPositions)

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
      instructions: hike.instructions || []
    }

  setFullRouteData(hikingFullData)
  setRouteSaved(false) // hiking routes are not saved by default

  } catch (error) {
    console.error('Error loading hiking route:', error)
    setErrorMsg('Errore nel caricamento del percorso di hiking')
  }
}

// Funzione helper per calcolare distanza (se non esiste già)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Raggio della Terra in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
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
      
      // Reverse geocoding per ottenere il nome del luogo
      try {
        const response = await fetch(
          `https://api.openrouteservice.org/geocode/reverse?api_key=${ORS_KEY}&point.lat=${lat}&point.lon=${lon}&size=1`
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data.features && data.features.length > 0) {
            const placeName = data.features[0].properties.label
            setStartText(`📍 ${placeName}`)
            setStartPoint({
              lat,
              lon,
              name: placeName
            })
          } else {
            setStartText('📍 La tua posizione')
          }
        } else {
          setStartText('📍 La tua posizione')
        }
      } catch (error) {
        console.error('Reverse geocoding error:', error)
        setStartText('📍 La tua posizione')
      }
      
      setGettingLocation(false)
      setUserLocation({ lat, lon })
    },
    (error) => {
      console.error('Geolocation error:', error)
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

 const geocodeText = async (text) => {
  if (!text) return null
  try {
    const url = `https://api.openrouteservice.org/geocode/search?api_key=${ORS_KEY}&text=${encodeURIComponent(text)}&boundary.country=IT&size=1`
    const resp = await fetch(url)
    if (!resp.ok) return null
    const json = await resp.json()
    if (json.features && json.features.length > 0) {
      const coords = json.features[0].geometry.coordinates
      return { 
        lat: coords[1], 
        lon: coords[0], 
        name: json.features[0].properties.label 
      }
    }
    return null
  } catch (err) {
    console.error('Geocoding error:', err)
    return null
  }
}

const fetchSuggestions = async (text) => {
  if (!text || text.length < 2) return []
  try {
    const url = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${ORS_KEY}&text=${encodeURIComponent(text)}&boundary.country=IT&size=5`
    const resp = await fetch(url)
    if (!resp.ok) return []
    const json = await resp.json()
    return json.features.map(feature => ({
      lat: feature.geometry.coordinates[1],
      lon: feature.geometry.coordinates[0],
      display_name: feature.properties.label,
      place_id: feature.properties.id
    }))
  } catch (err) {
    console.error('Suggestions error:', err)
    return []
  }
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




  const handleSubmit = async (e) => { //gestisco l'invio del form
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    setRouteInfo(null)
    setInstructions([])
    setFullRouteData(null)
    setIsPreloaded(false) //resetto lo stato di pre-caricamento

    // Ottengo coordinate se non già fornite
    let sp = startPoint
    let ep = endPoint

    // Geocodifico se necessario il punto di partenza
    if (!sp && startText) {
      sp = await geocodeText(startText)
      if (sp) setStartPoint(sp)
    }
    // Geocodifico se necessario il punto di arrivo
    if (!ep && endText) {
      ep = await geocodeText(endText)
      if (ep) setEndPoint(ep)
    }
    // Controllo che entrambi i punti siano disponibili
    if (!sp || !ep) {
      setLoading(false)
      setErrorMsg('Per favore inserisci sia il punto di partenza che quello di arrivo.')
      return
    }

    try { // Chiamata a OpenRouteService per il calcolo del percorso
      // Rimuovo layer e marker precedenti
      if (routeLayer && map) map.removeLayer(routeLayer)
      if (startMarkerRef.current) startMarkerRef.current.remove()
      if (endMarkerRef.current) endMarkerRef.current.remove()
      // Rimuovo listener precedente
      if (updateMarkersListenerRef.current && map) {
        map.off('move zoom', updateMarkersListenerRef.current)
      }

      const response = await fetch( 
        'https://api.openrouteservice.org/v2/directions/foot-hiking/geojson',
        {
          method: 'POST',
          headers: {
            'Authorization': ORS_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            coordinates: [[sp.lon, sp.lat], [ep.lon, ep.lat]],
            instructions: true,
            language: 'it',
            units: 'km',
            elevation: true
          })
        }
      )

      if (!response.ok) {// Gestione errori dalla API
        console.error('ORS API error:', response.status)
        setErrorMsg('Errore nel calcolo del percorso. Verifica la tua API key.')
        setLoading(false)
        return
      }

      const data = await response.json() // Processo la risposta

      if (data.features && data.features.length > 0) { // Disegno il percorso sulla mappa
        const feature = data.features[0]
        
        const newRouteLayer = L.geoJSON(feature, {
          style: { color: '#2563eb', weight: 4, opacity: 0.8 }
        }).addTo(map)
        setRouteLayer(newRouteLayer)

        
        const startMarkerDiv = document.createElement('div')
        startMarkerDiv.className = 'custom-html-marker start-marker'
        startMarkerDiv.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="32" height="32" fill="#10b981" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
            <path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/>
          </svg>
        `
        
        // Converto coordinate in pixel e posiziono il marcatore
        const startPointPixel = map.latLngToContainerPoint([sp.lat, sp.lon])
        startMarkerDiv.style.position = 'absolute'
        startMarkerDiv.style.left = `${startPointPixel.x}px`
        startMarkerDiv.style.top = `${startPointPixel.y}px`
        startMarkerDiv.style.transform = 'translate(-50%, -100%)'
        startMarkerDiv.style.zIndex = '400'
        startMarkerDiv.style.pointerEvents = 'none'
        
        document.getElementById('map').appendChild(startMarkerDiv)
        startMarkerRef.current = startMarkerDiv

        
        const endMarkerDiv = document.createElement('div')
        endMarkerDiv.className = 'custom-html-marker end-marker'
        endMarkerDiv.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="32" height="32" fill="#ef4444" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
            <path d="M32 0C49.7 0 64 14.3 64 32V48l69-17.2c38.1-9.5 78.3-5.1 113.5 12.5c46.3 23.2 100.8 23.2 147.1 0l9.6-4.8C423.8 28.1 448 43.1 448 66.1V345.8c0 13.3-8.3 25.3-20.8 30l-34.7 13c-46.2 17.3-97.6 14.6-141.7-7.4c-37.9-19-81.3-23.7-122.5-13.4L64 384v96c0 17.7-14.3 32-32 32s-32-14.3-32-32V400 334 64 32C0 14.3 14.3 0 32 0zM64 187.1l64-13.9v65.5L64 252.6V187.1zm0 96.8l64-13.9v65.5L64 349.4V283.9zM320 128c-13.3 0-24 10.7-24 24s10.7 24 24 24h32c13.3 0 24-10.7 24-24s-10.7-24-24-24H320z"/>
          </svg>
        `
        
        const endPointPixel = map.latLngToContainerPoint([ep.lat, ep.lon])
        endMarkerDiv.style.position = 'absolute'
        endMarkerDiv.style.left = `${endPointPixel.x}px`
        endMarkerDiv.style.top = `${endPointPixel.y}px`
        endMarkerDiv.style.transform = 'translate(-50%, -100%)'
        endMarkerDiv.style.zIndex = '400'
        endMarkerDiv.style.pointerEvents = 'none'
        
        document.getElementById('map').appendChild(endMarkerDiv)
        endMarkerRef.current = endMarkerDiv
        
        
        const updateMarkerPositions = () => {
          if (startMarkerRef.current) {
            const newStartPoint = map.latLngToContainerPoint([sp.lat, sp.lon])
            startMarkerRef.current.style.left = `${newStartPoint.x}px`
            startMarkerRef.current.style.top = `${newStartPoint.y}px`
          }
          
          if (endMarkerRef.current) {
            const newEndPoint = map.latLngToContainerPoint([ep.lat, ep.lon])
            endMarkerRef.current.style.left = `${newEndPoint.x}px`
            endMarkerRef.current.style.top = `${newEndPoint.y}px`
          }
        }
        
        // Salvo il listener in un ref
        updateMarkersListenerRef.current = updateMarkerPositions
        map.on('move zoom', updateMarkerPositions)
        
        // Adatto la vista della mappa al percorso
        map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] })

        // Estraggo e imposto le informazioni del percorso
        const props = feature.properties
        const summary = props.summary || {}
        
        //imposto le info del percorso
       const routeData = {
          distance: parseFloat((summary.distance).toFixed(2)), // converto in float
          duration: Math.round(summary.duration / 60),
          ascent: props.ascent ? Math.round(props.ascent) : 0,
          descent: props.descent ? Math.round(props.descent) : 0
        }
        
        // Salvo le info del percorso nello stato
        setRouteInfo(routeData)

        // Estraggo e imposto le istruzioni passo-passo
        if (props.segments && props.segments[0].steps) {
          setInstructions(props.segments[0].steps)
        }

        // Salvo tutti i dati del percorso 
        setFullRouteData({
          startPoint: sp,
          endPoint: ep,
          distance: routeData.distance,
          duration: routeData.duration,
          ascent: routeData.ascent,
          descent: routeData.descent,
          coordinates: feature.geometry.coordinates,
          instructions: props.segments && props.segments[0].steps ? props.segments[0].steps : []
        })
        // Newly calculated route is not saved yet
        setRouteSaved(false)
      } else { // Nessun percorso trovato
        setErrorMsg('Non è stato possibile calcolare un percorso.')
      }
    } catch (error) { // Gestione errori generali
      console.error('Error:', error)
      setErrorMsg('Errore nel calcolo del percorso.')
    }
    setLoading(false)
  }


  // Handlers per ActiveTracking (FUORI da handleSubmit!)
  const handleStartTracking = () => {
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
          <form onSubmit={handleSubmit} className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow-md w-full max-w-xl">
            {/* Input punto di partenza con bottone GPS */}
<div className="flex items-center space-x-2 relative">
  <div className="flex-1">
    <div className="relative">
      {/* Icona marker sempre visibile */}
      <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 pointer-events-none z-10" />
      
      <input
        ref={startInputRef}
        placeholder="Punto di partenza"
        value={startText}
        autoComplete="off"
        disabled={isPreloaded || gettingLocation}
        onFocus={() => { if (startText.length > 1) setShowStartDropdown(true) }}
        onBlur={() => setTimeout(() => setShowStartDropdown(false), 150)}
        onChange={async (e) => {
          const val = e.target.value
          setStartText(val)
          setStartPoint(null)
          if (val.length > 1) {
            setStartLoading(true)
            setShowStartDropdown(true)
            const suggestions = await fetchSuggestions(val)
            setStartSuggestions(suggestions)
            setStartLoading(false)
          } else {
            setStartSuggestions([])
            setShowStartDropdown(false)
          }
        }}
        className="route-input"
      />
      
      {/* Dropdown suggerimenti */}
      {showStartDropdown && (startSuggestions.length > 0 || startLoading) && (
        <ul className="route-suggestions-dropdown">
          {startLoading && <li className="route-suggestion-loading">Caricamento…</li>}
          {startSuggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              className="route-suggestion-item"
              onMouseDown={() => {
                setStartText(suggestion.display_name)
                setStartPoint({
                  lat: suggestion.lat,
                  lon: suggestion.lon,
                  name: suggestion.display_name,
                })
                setShowStartDropdown(false)
                setStartSuggestions([])
                startInputRef.current.blur()
              }}
            >
              {suggestion.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
  
  {/* Bottone GPS */}
  <button
    type="button"
    onClick={getCurrentLocation}
    disabled={gettingLocation || isPreloaded}
    className="gps-location-btn"
    title="Usa la tua posizione"
  >
    {gettingLocation ? (
      <FaSpinner className="animate-spin" />
    ) : (
      <FaLocationArrow />
    )}
  </button>
</div>

            <div className="flex items-center space-x-2 relative">
              
              <div className="flex-1">
                <div className="relative">
                   <FaFlag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-600 pointer-events-none z-10" />
                  <input
                    ref={endInputRef}
                    placeholder="Punto di arrivo"
                    value={endText}
                    autoComplete="off"
                    disabled={isPreloaded}
                    onFocus={() => { if (endText.length > 1) setShowEndDropdown(true) }}
                    onBlur={() => setTimeout(() => setShowEndDropdown(false), 150)}
                    onChange={async (e) => {
                      const val = e.target.value
                      setEndText(val)
                      setEndPoint(null)
                      if (val.length > 1) {
                        setEndLoading(true)
                        setShowEndDropdown(true)
                        const suggestions = await fetchSuggestions(val)
                        setEndSuggestions(suggestions)
                        setEndLoading(false)
                      } else {
                        setEndSuggestions([])
                        setShowEndDropdown(false)
                      }
                    }}
                   className="route-input"
                  />
                  {showEndDropdown && (endSuggestions.length > 0 || endLoading) && (
                    <ul className="route-suggestions-dropdown">
                      {endLoading && <li className="route-suggestion-loading">Caricamento…</li>}
                      {endSuggestions.map((suggestion) => (
                        <li
                          key={suggestion.place_id}
                          className="route-suggestion-item"
                          onMouseDown={() => {
                            setEndText(suggestion.display_name)
                            setEndPoint({
                              lat: suggestion.lat,
                              lon: suggestion.lon,
                              name: suggestion.display_name,
                            })
                            setShowEndDropdown(false)
                            setEndSuggestions([])
                            endInputRef.current.blur()
                          }}
                        >
                          {suggestion.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              
               <div className="w-12 h-12"></div>
            </div>

            {errorMsg && (
              <div className="route-error-message">
                {errorMsg}
              </div>
            )}
{!isPreloaded && (
  <button
    type="submit"
    disabled={loading}
    className="route-submit-btn"
  >
    {loading ? 'Calcolo percorso...' : 'Trova percorso'}
  </button>
)}
          </form>

          {/* Indicatore visuale gps */}
{userLocation && startPoint && startPoint.lat === userLocation.lat && (
  <div className="flex items-center space-x-2 px-4 py-2 bg-green-50 rounded-lg text-sm text-green-700">
    <FaLocationArrow className="text-green-600" />
    <span>Partenza impostata sulla tua posizione attuale</span>
  </div>
)}

          {/* Route Information Card */}
          {routeInfo && (
            <div className="route-info-container">
  <h3 className="route-info-header">Informazioni Percorso</h3>
  <div className="route-info-stats-grid">
                <div className="route-stat-card">
  <FaRoute className="route-stat-icon-distance" />
  <div className="route-stat-details">
    <p className="route-stat-label">Distanza</p>
    <p className="route-stat-value">{routeInfo.distance} km</p>
  </div>
</div>
                <div className="route-stat-card">
  <FaClock className="route-stat-icon-duration" />
  <div className="route-stat-details">
    <p className="route-stat-label">Durata</p>
    <p className="route-stat-value">{routeInfo.duration} min</p>
  </div>
</div>
                <div className="route-stat-card">
  <FaWalking className="route-stat-icon-ascent" />
  <div className="route-stat-details">
    <p className="route-stat-label">Salita</p>
    <p className="route-stat-value">{routeInfo.ascent} m</p>
  </div>
</div>
                <div className="route-stat-card">
  <FaWalking className="route-stat-icon-descent" />
  <div className="route-stat-details">
    <p className="route-stat-label">Discesa</p>
    <p className="route-stat-value">{routeInfo.descent} m</p>
  </div>
</div>
              </div>

              <div className="mt-4 pt-4 border-t space-y-2">
               {fullRouteData && (!isPreloaded || preloadedHike) && !routeSaved && (
    <SaveRouteButton
      routeData={fullRouteData}
      onSaved={(savedId) => {
        setRouteSaved(true)
        if (savedId) {
          setFullRouteData((prev) => ({ ...(prev || {}), savedId }))
        }
      }}
    />
  )}
          
  
  {/* NUOVO: Pulsante per ActiveTracking */}
  <button
    onClick={handleStartTracking}
    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition"
  >
    <FaPlay />
    <span>🎯 Tracking GPS con Statistiche</span>
  </button>
  
  {/* Pulsante Navigazione guidata (quello esistente) */}
  <button
    onClick={() => startNavigation()}
    className="route-gps-btn"
  >
    <FaLocationArrow />
    <span>🧭 Navigazione Guidata</span>
  </button>
</div>
</div>  
          )}


          {/* Turn-by-turn Instructions */}
          {instructions.length > 0 && (
            <div className="route-instructions-container">
  <h3 className="route-instructions-title">Indicazioni Stradali</h3>
  <div className="route-instructions-list">
    {instructions.map((step, idx) => (
      <div key={idx} className="route-instruction-step">
        <span className="route-instruction-badge">
          {idx + 1}
        </span>
        <div className="route-instruction-content">
          <p className="route-instruction-text">{step.instruction}</p>
          <p className="route-instruction-meta">
                        {step.distance > 0 
                          ? step.distance >= 1 
                            ? `${step.distance.toFixed(2)} km` 
                            : `${(step.distance * 1000).toFixed(0)} m`
                          : '0 m'
                        } · {Math.round(step.duration / 60)} min
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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