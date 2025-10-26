import React, { useState, useEffect } from 'react'
import { FaHiking, FaTimes, FaSpinner, FaMapMarkerAlt, FaRulerCombined, FaChevronRight } from 'react-icons/fa'

// Componente per mostrare i percorsi di hiking nelle vicinanze
const NearbyHikes = ({ onClose, onSelectHike }) => {
  const [loading, setLoading] = useState(true)
  const [hikes, setHikes] = useState([])
  const [error, setError] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [radiusKm, setRadiusKm] = useState(10)

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
    
    // Prima prova: solo relations (percorsi principali)
    const query1 = `
      [out:json][timeout:15];
      (
        relation["route"="hiking"]["name"](around:${radiusKm * 1000},${lat},${lon});
      );
      out body;
      >;
      out skel qt;
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
        out body 10;
        >;
        out skel qt;
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
        out body 15;
        >;
        out skel qt;
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
  
// Funzione per processare i dati ricevuti da Overpass API
  const processOverpassData = (data, userLat, userLon) => {
    const hikes = []
    const processedIds = new Set()

    // Processa relations (percorsi completi)
    data.elements.forEach(element => {
      if (element.type === 'relation' && element.tags && element.tags.name && !processedIds.has(element.id)) {
        processedIds.add(element.id)
        
        // Calcola punto centrale approssimativo
        const nodes = data.elements.filter(e => 
          e.type === 'node' && element.members?.some(m => m.ref === e.id)
        )
        
        if (nodes.length > 0) {
          const avgLat = nodes.reduce((sum, n) => sum + n.lat, 0) / nodes.length
          const avgLon = nodes.reduce((sum, n) => sum + n.lon, 0) / nodes.length
          const distance = calculateDistance(userLat, userLon, avgLat, avgLon)
// Aggiungi il percorso alla lista
          hikes.push({
            id: element.id,
            type: 'relation',
            name: element.tags.name,
            distance: distance,
            difficulty: element.tags.sac_scale || element.tags['osmc:symbol'] || 'Non specificata',
            description: element.tags.description || '',
            operator: element.tags.operator || '',
            coordinates: nodes.map(n => [n.lon, n.lat]),
            center: { lat: avgLat, lon: avgLon }
          })
        }
      }
    })

    // Processa ways (sentieri singoli)
    data.elements.forEach(element => {
      if (element.type === 'way' && element.tags && element.tags.name && !processedIds.has(element.id)) {
        processedIds.add(element.id)
        // Calcola punto centrale approssimativo
        const nodes = data.elements.filter(e => 
          e.type === 'node' && element.nodes?.includes(e.id)
        )
        
        if (nodes.length > 0) {
          const avgLat = nodes.reduce((sum, n) => sum + n.lat, 0) / nodes.length
          const avgLon = nodes.reduce((sum, n) => sum + n.lon, 0) / nodes.length
          const distance = calculateDistance(userLat, userLon, avgLat, avgLon)

          hikes.push({
            id: element.id,
            type: 'way',
            name: element.tags.name,
            distance: distance,
            difficulty: element.tags.sac_scale || 'Non specificata',
            description: element.tags.description || '',
            coordinates: nodes.map(n => [n.lon, n.lat]),
            center: { lat: avgLat, lon: avgLon }
          })
        }
      }
    })

    // Ordina per distanza
    return hikes.sort((a, b) => a.distance - b.distance).slice(0, 20)
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-400 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaHiking className="text-3xl" />
              <div>
                <h2 className="text-2xl font-bold">Percorsi nelle vicinanze</h2>
                <p className="text-sm text-green-100">
                  {userLocation ? `📍 Entro ${radiusKm} km da te` : 'Ricerca in corso...'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
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
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      radiusKm === km 
                        ? 'bg-white text-green-600' 
                        : 'bg-green-700 text-white hover:bg-green-800'
                    }`}
                  >
                    {km} km
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <FaSpinner className="text-4xl text-green-600 animate-spin mb-4" />
              <p className="text-gray-600">Ricerca percorsi in corso...</p>
              <p className="text-sm text-gray-400 mt-2">Può richiedere alcuni secondi</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
              <p className="font-medium">⚠️ {error}</p>
            </div>
          )}

          {!loading && !error && hikes.length > 0 && (
            <div className="space-y-3">
              {hikes.map((hike) => (
                <div
                  key={`${hike.type}-${hike.id}`}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => onSelectHike(hike)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 mb-1">{hike.name}</h3>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center space-x-1">
                          <FaMapMarkerAlt className="text-green-600" />
                          <span>{hike.distance.toFixed(1)} km da te</span>
                        </span>
                        
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
                    </div>

                    <FaChevronRight className="text-gray-400 ml-4" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default NearbyHikes