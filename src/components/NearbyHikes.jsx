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
  // Funzione per cercare i percorsi di hiking nelle vicinanze usando Overpass API
const fetchNearbyHikes = async (lat, lon) => {
  try {
    setLoading(true)
    setError('')

    // Query principale: percorsi escursionistici (relations e ways)
    const query = `
      [out:json][timeout:25];
      (
        // Relations di percorsi escursionistici
        relation["route"="hiking"]["name"](around:${radiusKm * 1000},${lat},${lon});
        // Ways singoli con sentieri e scala di difficoltà
        way["highway"="path"]["name"](around:${radiusKm * 1000},${lat},${lon});
        way["highway"="footway"]["name"](around:${radiusKm * 1000},${lat},${lon});
      );
      out tags geom;
    `;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    });

    if (!response.ok) {
      throw new Error('Errore dal server Overpass');
    }

    const data = await response.json();
    const processedHikes = processOverpassData(data, lat, lon);

    setHikes(processedHikes);

    if (processedHikes.length === 0) {
      setError(`Nessun sentiero trovato entro ${radiusKm} km.
        Prova ad aumentare il raggio o spostarti in una zona più montuosa.
        ${radiusKm < 20 ? 'Suggerimento: prova con 20 o 50 km.' : ''}`);
    }
  } catch (err) {
    console.error('Error fetching hikes:', err);
    setError('Errore nel caricamento dei percorsi o server Overpass sovraccarico. Riprova tra qualche minuto.');
  } finally {
    setLoading(false);
  }
};


// Funzione per processare i dati ricevuti da Overpass API 
const processOverpassData = (data, userLat, userLon) => {
  const hikes = [];
  const processedIds = new Set();

  data.elements.forEach(element => {
    if (!element.tags || !element.tags.name || processedIds.has(element.id)) return;
    processedIds.add(element.id);

    let coordinates = [];

    // Usa geometria già fornita da Overpass
    if (element.geometry && element.geometry.length > 0) {
      coordinates = element.geometry.map(point => [point.lon, point.lat]);
    } else if (element.members) {
      // Se è una relation, prova a costruire le coordinate dai membri
      element.members.forEach(member => {
        if (member.geometry) {
          member.geometry.forEach(point => {
            coordinates.push([point.lon, point.lat]);
          });
        }
      });
    }

    coordinates = removeDuplicatePoints(coordinates);
    if (coordinates.length < 2) return;

    // Calcola posizione media e distanza dall'utente
    const avgLat = coordinates.reduce((sum, c) => sum + c[1], 0) / coordinates.length;
    const avgLon = coordinates.reduce((sum, c) => sum + c[0], 0) / coordinates.length;
    const distance = calculateDistance(userLat, userLon, avgLat, avgLon);
    const length = calculatePathLength(coordinates);

    // Cerca di determinare la difficoltà
    let difficulty = element.tags.sac_scale;

    // Se è una relation, prova a vedere se i membri hanno sac_scale
    if (!difficulty && element.members) {
      const memberDiff = element.members.find(m => m.tags && m.tags.sac_scale);
      if (memberDiff) difficulty = memberDiff.tags.sac_scale;
    }

    hikes.push({
      id: element.id,
      type: element.type,
      name: element.tags.name,
      distance,
      length,
      difficulty: difficulty || 'Non specificata',
      description: element.tags.description || '',
      operator: element.tags.operator || '',
      coordinates,
      center: { lat: avgLat, lon: avgLon }
    });
  });

  // Ordina per distanza
  return hikes.sort((a, b) => a.distance - b.distance).slice(0, 20);
};


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

// Funzione per ottenere l'etichetta della difficoltà
  const getDifficultyColor = (difficulty) => {
  if (!difficulty || difficulty === 'Non specificata') return 'hike-difficulty-gray'
  const lower = difficulty.toLowerCase()
  if (lower.includes('hiking') || lower === 't1') return 'hike-difficulty-green'
  if (lower.includes('mountain_hiking') || lower === 't2') return 'hike-difficulty-blue'
  if (lower.includes('demanding') || lower === 't3') return 'hike-difficulty-orange'
  if (lower.includes('alpine') || lower === 't4' || lower === 't5' || lower === 't6') return 'hike-difficulty-red'
  return 'hike-difficulty-gray'
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
                          <span className="hike-detail-item">
  <FaMapMarkerAlt className="hike-detail-icon-location" />
  <span>{hike.distance.toFixed(1)} km da te</span>
</span>
                          
                          {hike.length > 0 && (
  <span className="hike-detail-item">
    <FaRulerCombined className="hike-detail-icon-length" />
    <span>{hike.length.toFixed(1)} km</span>
  </span>
)}
                          
                          
       <span className={getDifficultyColor(hike.difficulty)}>{hike.difficulty}
  
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