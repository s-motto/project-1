import React, { useState, useEffect } from 'react'
import { FaHiking, FaTimes, FaSpinner, FaMapMarkerAlt, FaRulerCombined, FaChevronRight, FaMountain } from 'react-icons/fa'

// Componente per mostrare i percorsi di hiking nelle vicinanze
const NearbyHikes = ({ onClose, onSelectHike }) => {
  const [loading, setLoading] = useState(true)
  const [hikes, setHikes] = useState([])
  const [error, setError] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [radiusKm, setRadiusKm] = useState(10)
  const [loadingElevation, setLoadingElevation] = useState(null) // ID del percorso in caricamento

  // Effettua la ricerca dei percorsi quando il componente viene montato o il raggio cambia
  useEffect(() => {
    getUserLocationAndFetchHikes()
  }, [radiusKm])
// Funzione per ottenere la posizione dell'utente e cercare i percorsi
  const getUserLocationAndFetchHikes = () => {
    setLoading(true)
    setError('')

    // Chiedi la posizione GPS
    if (!navigator.geolocation) {
      setError('Il tuo browser non supporta la geolocalizzazione')
      setLoading(false)
      return
    }
// Ottieni la posizione corrente
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude
        setUserLocation({ lat, lon })
        await fetchNearbyHikes(lat, lon)
      },
      (error) => {
        console.error('Geolocation error:', error)
        setError('Non è stato possibile ottenere la tua posizione. Assicurati di aver dato i permessi.')
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }
// Funzione per cercare i percorsi di hiking nelle vicinanze usando Overpass API
  const fetchNearbyHikes = async (lat, lon) => {
  try {
    // Query SEMPLIFICATA - cerca solo percorsi hiking nominati
    // Divisa in due query più piccole per evitare timeout
    
    // Prima prova: solo relations (percorsi principali) - ✅ FIXED: usa out geom
    const query1 = `
      [out:json][timeout:15];
      (
        relation["route"="hiking"]["name"](around:${radiusKm * 1000},${lat},${lon});
      );
      out geom;
    `

    let response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query1
    })

    let data
    
    if (!response.ok) {
      // Fallback: prova con query ancora più semplice
      console.log('Prima query fallita, provo con query ridotta...')
      const query2 = `
        [out:json][timeout:10];
        (
          relation["route"="hiking"]["name"](around:${Math.min(radiusKm * 1000, 10000)},${lat},${lon});
        );
        out geom 10;
      `
      
      response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query2
      })
      
      if (!response.ok) {
        throw new Error('Server Overpass temporaneamente non disponibile')
      }
    }

    data = await response.json()
    
    // Se non troviamo nulla con le relations, prova con i ways
    if (!data.elements || data.elements.length < 5) {
      console.log('Pochi risultati, cerco anche sentieri singoli...')
      const query3 = `
        [out:json][timeout:10];
        (
          way["highway"="path"]["name"]["sac_scale"](around:${Math.min(radiusKm * 1000, 10000)},${lat},${lon});
        );
        out geom 15;
      `
      
      const response3 = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query3
      })
      
      if (response3.ok) {
        const data3 = await response3.json()
        // Combina i risultati
        data.elements = [...(data.elements || []), ...(data3.elements || [])]
      }
    }
    
    // Processa i risultati
    const processedHikes = processOverpassData(data, lat, lon)
    setHikes(processedHikes)
    
    if (processedHikes.length === 0) {
      setError(`Nessun sentiero trovato entro ${radiusKm} km. 
        Prova ad aumentare il raggio o spostati in una zona più montuosa.
        ${radiusKm < 20 ? 'Suggerimento: prova con 20 o 50 km.' : ''}`)
    }
  } catch (err) {
    console.error('Error fetching hikes:', err)
    if (err.message.includes('Overpass')) {
      setError('Il server Overpass è temporaneamente sovraccarico. Riprova tra qualche minuto o aumenta il raggio di ricerca.')
    } else {
      setError('Errore nel caricamento dei percorsi. Controlla la connessione internet e riprova.')
    }
  } finally {
    setLoading(false)
  }
}
  
// Funzione per processare i dati ricevuti da Overpass API - ✅ FIXED: ordine corretto dei nodi + smoothing
  const processOverpassData = (data, userLat, userLon) => {
    const hikes = []
    const processedIds = new Set()

    // Processa relations (percorsi completi)
    data.elements.forEach(element => {
      if (element.type === 'relation' && element.tags && element.tags.name && !processedIds.has(element.id)) {
        processedIds.add(element.id)
        
        // Per le relations con out geom, i membri hanno già la geometria completa
        let coordinates = []
        
        if (element.members) {
          // Segui l'ordine dei membri della relation
          element.members.forEach(member => {
            if (member.geometry && member.geometry.length > 0) {
              // Aggiungi tutte le coordinate del membro nell'ordine corretto
              member.geometry.forEach(point => {
                coordinates.push([point.lon, point.lat])
              })
            }
          })
        }
        
        // Se non ci sono coordinate dai membri, prova con la geometria diretta
        if (coordinates.length === 0 && element.geometry) {
          coordinates = element.geometry.map(point => [point.lon, point.lat])
        }
        
        // Rimuovi duplicati consecutivi per pulire il percorso
        coordinates = removeDuplicatePoints(coordinates)
        
        if (coordinates.length > 1) {
          // Calcola punto centrale
          const avgLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length
          const avgLon = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length
          const distance = calculateDistance(userLat, userLon, avgLat, avgLon)
          
          // Calcola lunghezza approssimativa del percorso
          const length = calculatePathLength(coordinates)

          // ✅ FIX: Non usare osmc:symbol per la difficoltà, solo sac_scale
          hikes.push({
            id: element.id,
            type: 'relation',
            name: element.tags.name,
            distance: distance,
            length: length,
            difficulty: element.tags.sac_scale || 'Non specificata',
            description: element.tags.description || '',
            operator: element.tags.operator || '',
            coordinates: coordinates,
            center: { lat: avgLat, lon: avgLon }
          })
        }
      }
    })

    // Processa ways (sentieri singoli) - ✅ FIXED: usa geometry nell'ordine corretto
    data.elements.forEach(element => {
      if (element.type === 'way' && element.tags && element.tags.name && !processedIds.has(element.id)) {
        processedIds.add(element.id)
        
        // Con out geom, il way ha già la proprietà geometry con tutti i punti nell'ordine corretto
        let coordinates = []
        
        if (element.geometry && element.geometry.length > 0) {
          coordinates = element.geometry.map(point => [point.lon, point.lat])
        }
        
        // Rimuovi duplicati consecutivi
        coordinates = removeDuplicatePoints(coordinates)
        
        if (coordinates.length > 1) {
          // Calcola punto centrale
          const avgLat = coordinates.reduce((sum, coord) => sum + coord[1], 0) / coordinates.length
          const avgLon = coordinates.reduce((sum, coord) => sum + coord[0], 0) / coordinates.length
          const distance = calculateDistance(userLat, userLon, avgLat, avgLon)
          
          // Calcola lunghezza approssimativa del percorso
          const length = calculatePathLength(coordinates)

          hikes.push({
            id: element.id,
            type: 'way',
            name: element.tags.name,
            distance: distance,
            length: length,
            difficulty: element.tags.sac_scale || 'Non specificata',
            description: element.tags.description || '',
            coordinates: coordinates,
            center: { lat: avgLat, lon: avgLon }
          })
        }
      }
    })

    // Ordina per distanza
    return hikes.sort((a, b) => a.distance - b.distance).slice(0, 20)
  }

  // Rimuovi punti duplicati consecutivi
  const removeDuplicatePoints = (coordinates) => {
    if (coordinates.length <= 1) return coordinates
    
    const filtered = [coordinates[0]]
    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1]
      const curr = coordinates[i]
      
      // Aggiungi solo se il punto è diverso dal precedente
      if (prev[0] !== curr[0] || prev[1] !== curr[1]) {
        filtered.push(curr)
      }
    }
    return filtered
  }

  // Calcola lunghezza del percorso
  const calculatePathLength = (coordinates) => {
    let length = 0
    for (let i = 1; i < coordinates.length; i++) {
      length += calculateDistance(
        coordinates[i-1][1], coordinates[i-1][0],
        coordinates[i][1], coordinates[i][0]
      )
    }
    return length
  }

  // Calcola elevazione usando OpenRouteService
  const calculateElevation = async (coordinates) => {
    try {
      const ORS_KEY = import.meta.env.VITE_OPENROUTE_API_KEY
      
      if (!ORS_KEY) {
        console.error('OpenRouteService API key non trovata')
        return { ascent: 0, descent: 0 }
      }

      // OpenRouteService elevation endpoint - max 2000 coordinate
      // Se abbiamo troppi punti, campiona
      let sampledCoords = coordinates
      if (coordinates.length > 500) {
        sampledCoords = []
        const step = Math.ceil(coordinates.length / 500)
        for (let i = 0; i < coordinates.length; i += step) {
          sampledCoords.push(coordinates[i])
        }
        // Aggiungi sempre l'ultimo punto
        if (sampledCoords[sampledCoords.length - 1] !== coordinates[coordinates.length - 1]) {
          sampledCoords.push(coordinates[coordinates.length - 1])
        }
      }

      const response = await fetch(
        'https://api.openrouteservice.org/elevation/line',
        {
          method: 'POST',
          headers: {
            'Authorization': ORS_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            format_in: 'geojson',
            format_out: 'geojson',
            geometry: {
              coordinates: sampledCoords,
              type: 'LineString'
            }
          })
        }
      )

      if (!response.ok) {
        throw new Error('Errore nel calcolo elevazione')
      }

      const data = await response.json()
      
      // Calcola salita e discesa dalle elevazioni
      let ascent = 0
      let descent = 0
      
      const elevations = data.geometry.coordinates.map(coord => coord[2])
      
      for (let i = 1; i < elevations.length; i++) {
        const diff = elevations[i] - elevations[i - 1]
        if (diff > 0) {
          ascent += diff
        } else {
          descent += Math.abs(diff)
        }
      }

      return { 
        ascent: Math.round(ascent), 
        descent: Math.round(descent),
        elevations: elevations
      }
    } catch (error) {
      console.error('Errore calcolo elevazione:', error)
      return { ascent: 0, descent: 0 }
    }
  }

  // Gestisci selezione percorso con calcolo elevazione
  const handleSelectHike = async (hike) => {
    setLoadingElevation(`${hike.type}-${hike.id}`)
    
    try {
      // Calcola elevazione prima di passare al componente padre
      const elevation = await calculateElevation(hike.coordinates)
      
      // Aggiungi i dati di elevazione al percorso
      const hikeWithElevation = {
        ...hike,
        ascent: elevation.ascent,
        descent: elevation.descent,
        elevations: elevation.elevations
      }
      
      onSelectHike(hikeWithElevation)
    } catch (error) {
      console.error('Errore durante la selezione:', error)
      // Passa comunque il percorso senza elevazione
      onSelectHike(hike)
    } finally {
      setLoadingElevation(null)
    }
  }

// Funzione per calcolare la distanza tra due coordinate geografiche
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371 // Raggio della Terra in km
    const dLat = (lat2 - lat1) * Math.PI / 180 // conversione in radianti
    const dLon = (lon2 - lon1) * Math.PI / 180 // conversione in radianti
    // Haversine formula
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
// Funzione per ottenere il colore in base alla difficoltà
  const getDifficultyColor = (difficulty) => {
    if (!difficulty || difficulty === 'Non specificata') return 'bg-gray-500'
    const lower = difficulty.toLowerCase()
    if (lower.includes('hiking') || lower === 't1') return 'bg-green-500'
    if (lower.includes('mountain_hiking') || lower === 't2') return 'bg-blue-500'
    if (lower.includes('demanding') || lower === 't3') return 'bg-orange-500'
    if (lower.includes('alpine') || lower === 't4' || lower === 't5' || lower === 't6') return 'bg-red-500'
    return 'bg-gray-500'
  }
// Funzione per ottenere l'etichetta della difficoltà
  const getDifficultyLabel = (difficulty) => {
    if (!difficulty || difficulty === 'Non specificata') return 'Non specificata'
    const lower = difficulty.toLowerCase()
    if (lower === 't1' || lower.includes('hiking')) return 'Escursionismo (T1)'
    if (lower === 't2' || lower.includes('mountain_hiking')) return 'Montagna (T2)'
    if (lower === 't3' || lower.includes('demanding')) return 'Impegnativo (T3)'
    if (lower === 't4') return 'Alpinismo (T4)'
    if (lower === 't5' || lower === 't6') return 'Alpinismo esperto (T5+)'
    return difficulty
  }

  return (
    <div className="hikes-modal-overlay">
  <div className="hikes-modal-content">
        {/* Header */}
        <div className="hikes-modal-header">
  <div className="hikes-header-row">
    <div className="hikes-header-content">
      <FaHiking className="hikes-header-icon" />
      <div className="hikes-header-text-container">
        <h2 className="hikes-header-title">Percorsi nelle vicinanze</h2>
        <p className="hikes-header-subtitle">
                  {userLocation ? `📍 Entro ${radiusKm} km da te` : 'Ricerca in corso...'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="hikes-close-btn"
              aria-label="Chiudi"
            >
              <FaTimes className="text-xl" />
            </button>
          </div>

          {/* Radius selector */}
          {userLocation && (
            <div className="mt-4">
              <label className="text-sm text-green-100 block mb-2">Raggio di ricerca:</label>
              <div className="flex space-x-2">
                {[5, 10, 20, 50].map(km => (
                  <button
                    key={km}
                    onClick={() => setRadiusKm(km)}
                    className={radiusKm === km ? 'hikes-radius-btn-active' : 'hikes-radius-btn-inactive'}
                    
                  >
                    {km} km
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="hikes-modal-body">
          {loading && (
           <div className="hikes-loading-container">
  <FaSpinner className="hikes-loading-icon" />
  <p className="text-gray-600">Ricerca percorsi in corso...</p>
  <p className="hikes-loading-text">Può richiedere alcuni secondi</p>
</div>
          )}

          {error && !loading && (
            <div className="hikes-error-message">
  <p>⚠️ {error}</p>
</div>
          )}

          {!loading && !error && hikes.length > 0 && (
           <div className="hikes-list">
  {hikes.map((hike) => {
    const isLoadingThis = loadingElevation === `${hike.type}-${hike.id}`
    
    return (
      <div
        key={`${hike.type}-${hike.id}`}
        className={isLoadingThis ? 'hike-card-loading' : 'hike-card'}
        onClick={() => !isLoadingThis && handleSelectHike(hike)}
      >
        <div className="hike-card-content">
          <div className="hike-card-main">
            <h3 className="hike-title">{hike.name}</h3>
                        
                        <div className="flex items-center flex-wrap gap-3 text-sm text-gray-600 mb-2">
                          <span className="flex items-center space-x-1">
                            <FaMapMarkerAlt className="text-green-600" />
                            <span>{hike.distance.toFixed(1)} km da te</span>
                          </span>
                          
                          {hike.length > 0 && (
                            <span className="flex items-center space-x-1">
                              <FaRulerCombined className="text-blue-600" />
                              <span>{hike.length.toFixed(1)} km</span>
                            </span>
                          )}
                          
                          <span className={`px-2 py-0.5 rounded text-xs text-white ${getDifficultyColor(hike.difficulty)}`}>
                            {getDifficultyLabel(hike.difficulty)}
                          </span>
                        </div>

                        {hike.description && (
                          <p className="text-sm text-gray-600 mb-2">{hike.description}</p>
                        )}

                        {hike.operator && (
                          <p className="text-xs text-gray-500">📋 {hike.operator}</p>
                        )}

                        {isLoadingThis && (
                          <div className="mt-2 flex items-center space-x-2 text-sm text-green-600">
                            <FaSpinner className="animate-spin" />
                            <span>Calcolo elevazione...</span>
                          </div>
                        )}
                      </div>

                      {!isLoadingThis && <FaChevronRight className="text-gray-400 ml-4" />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NearbyHikes