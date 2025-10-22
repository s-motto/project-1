import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLocationDot, faFlag } from '@fortawesome/free-solid-svg-icons'
import '@geoapify/geocoder-autocomplete/styles/minimal.css'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const RouteSearchForm = () => {
  // State management for our component
  // Store the selected start and end points with their coordinates
  const [startPoint, setStartPoint] = useState(null)
  const [endPoint, setEndPoint] = useState(null)
  // Store the map instance to manipulate it later
  const [map, setMap] = useState(null)
  // Store the current route layer to remove it when calculating a new route
  const [routeLayer, setRouteLayer] = useState(null)
  // Keep the raw typed text so users can type without depending on the
  // autocomplete component. We'll geocode these on submit if the user
  // didn't select a suggestion.
  const [startText, setStartText] = useState('')
  const [endText, setEndText] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  // Custom autocomplete state
  const [startSuggestions, setStartSuggestions] = useState([])
  const [endSuggestions, setEndSuggestions] = useState([])
  const [showStartDropdown, setShowStartDropdown] = useState(false)
  const [showEndDropdown, setShowEndDropdown] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [endLoading, setEndLoading] = useState(false)
  const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || ''
  const startInputRef = useRef()
  const endInputRef = useRef()

  // Initialize the map when the component mounts
  useEffect(() => {
    // Create a new map instance centered on Milan, Italy
    const mapInstance = L.map('map').setView([45.4642, 9.1900], 13) // Default view on Milan
    
    // Add the OpenStreetMap tile layer to our map
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, // Maximum zoom level
      attribution: '© OpenStreetMap contributors' // Required attribution
    }).addTo(mapInstance)
    
    // Save the map instance in state to use it later
    setMap(mapInstance)

    // Cleanup function to remove the map when component unmounts
    return () => {
      if (mapInstance) {
        mapInstance.remove()
      }
    }
  }, []) // Empty dependency array means this runs once on mount

  // Helper: fallback forward-geocoding using Geoapify when user typed but didn't select
  const geocodeText = async (text) => {
    if (!text) return null
    try {
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
        text
      )}&limit=1&lang=it&apiKey=${import.meta.env.VITE_GEOAPIFY_API_KEY}`
      const resp = await fetch(url)
      if (!resp.ok) {
        const body = await resp.text()
        console.error('Geocode search error', resp.status, body, url)
        return null
      }
      const json = await resp.json()
      if (json.features && json.features.length > 0) {
        const props = json.features[0].properties
        return { lat: props.lat, lon: props.lon, name: props.formatted }
      }
      return null
    } catch (err) {
      console.error('Geocoding error for', text, err)
      return null
    }
  }

  // Handle form submission to calculate and display the route
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Debug logs to help trace values
    console.log('Before submit - selected startPoint:', startPoint)
    console.log('Before submit - selected endPoint:', endPoint)

    setErrorMsg('')
    setLoading(true)

    // If user typed but didn't pick a suggestion, use the typed text
    // (we store it in startText/endText). This avoids querying the DOM.
    let sp = startPoint
    let ep = endPoint

    if (!sp && startText) {
      console.log('No selected startPoint — will geocode typed text:', startText)
      sp = await geocodeText(startText)
      if (sp) setStartPoint(sp)
    }

    if (!ep && endText) {
      console.log('No selected endPoint — will geocode typed text:', endText)
      ep = await geocodeText(endText)
      if (ep) setEndPoint(ep)
    }

    if (!sp || !ep) {
      setLoading(false)
      setErrorMsg('Per favore inserisci e seleziona (o digita) sia il punto di partenza che quello di arrivo.')
      alert('Please select both start and end points')
      return
    }

    try {
      // optional: show a short delay so the user sees the loading state
      await new Promise((r) => setTimeout(r, 200))
      // Call Geoapify Routing API to get the route
      const response = await fetch(
        `https://api.geoapify.com/v1/routing?waypoints=${sp.lat},${sp.lon}|${ep.lat},${ep.lon}&mode=walk&apiKey=${import.meta.env.VITE_GEOAPIFY_API_KEY}`
      )
      const data = await response.json()

      // Remove any existing route from the map
      if (routeLayer && map) {
        map.removeLayer(routeLayer)
      }

      // If we got a valid route back, display it on the map
      if (data.features && data.features.length > 0) {
        const newRouteLayer = L.geoJSON(data.features[0]).addTo(map)
        setRouteLayer(newRouteLayer)
        
        // Adjust the map view to show the entire route
        map.fitBounds(newRouteLayer.getBounds(), { padding: [50, 50] })
      } else {
        console.warn('Routing response had no features', data)
        setErrorMsg('Non è stato possibile calcolare un percorso per i punti selezionati.')
        alert('Could not calculate route for the selected points')
      }
    } catch (error) {
      console.error('Error fetching route:', error)
      setErrorMsg('Errore nel calcolo del percorso. Controlla la console per dettagli.')
      alert('Error calculating route. Please try again.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-4 p-4 bg-white rounded-lg shadow-md w-full max-w-xl">
      {/* Start point input container */}
      <div className="flex items-center space-x-2 relative">
        {/* Green location icon for start point */}
        <FontAwesomeIcon icon={faLocationDot} className="text-green-600 absolute left-2 z-10" />
        <div className="flex-1">
          {/* Either show lazy autocomplete (when available) or a plain input */}
          <div className="relative">
              <input
              ref={startInputRef}
              placeholder="Punto di partenza"
              value={startText}
              autoComplete="off"
              onFocus={() => {
                if (startText.length > 1) setShowStartDropdown(true)
              }}
              onBlur={() => setTimeout(() => setShowStartDropdown(false), 150)}
              onChange={async (e) => {
                const val = e.target.value
                setStartText(val)
                setStartPoint(null)
                if (val.length > 1 && GEOAPIFY_KEY) {
                  setStartLoading(true)
                  setShowStartDropdown(true)
                  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(val)}&lang=it&filter=countrycode:it&limit=5&apiKey=${GEOAPIFY_KEY}`
                  const resp = await fetch(url)
                  if (!resp.ok) {
                    const body = await resp.text()
                    console.error('Autocomplete error', resp.status, body, url)
                    setStartSuggestions([])
                    setStartLoading(false)
                  } else {
                    const json = await resp.json()
                    setStartSuggestions(json.features || [])
                    setStartLoading(false)
                  }
                } else {
                  setStartSuggestions([])
                  setShowStartDropdown(false)
                }
              }}
              className="pl-10 w-full py-3 h-12 text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[200px] sm:min-w-[320px] max-w-full"
            />
            {showStartDropdown && (startSuggestions.length > 0 || startLoading) && (
              <ul className="absolute z-20 left-0 right-0 bg-white border rounded shadow max-h-40 overflow-y-auto mt-1">
                {startLoading && <li className="p-2 text-xs text-gray-400">Caricamento…</li>}
                {startSuggestions.map((feat) => (
                  <li
                    key={feat.properties.place_id}
                    className="p-2 hover:bg-blue-100 cursor-pointer text-sm"
                    onMouseDown={() => {
                      setStartText(feat.properties.formatted)
                      setStartPoint({
                        lat: feat.properties.lat,
                        lon: feat.properties.lon,
                        name: feat.properties.formatted,
                      })
                      setShowStartDropdown(false)
                      setStartSuggestions([])
                      startInputRef.current.blur()
                    }}
                  >
                    {feat.properties.formatted}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Se non selezioni una proposta, il testo digitato verrà geocodificato al submit.</p>
      </div>

      {/* End point input container */}
      <div className="flex items-center space-x-2 relative">
        {/* Red flag icon for end point */}
        <FontAwesomeIcon icon={faFlag} className="text-red-600 absolute left-2 z-10" />
        <div className="flex-1">
          <div className="relative">
            <input
              ref={endInputRef}
              placeholder="Punto di arrivo"
              value={endText}
              autoComplete="off"
              onFocus={() => {
                if (endText.length > 1) setShowEndDropdown(true)
              }}
              onBlur={() => setTimeout(() => setShowEndDropdown(false), 150)}
              onChange={async (e) => {
                const val = e.target.value
                setEndText(val)
                setEndPoint(null)
                if (val.length > 1 && GEOAPIFY_KEY) {
                  setEndLoading(true)
                  setShowEndDropdown(true)
                  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(val)}&lang=it&filter=countrycode:it&limit=5&apiKey=${GEOAPIFY_KEY}`
                  const resp = await fetch(url)
                  if (!resp.ok) {
                    const body = await resp.text()
                    console.error('Autocomplete error', resp.status, body, url)
                    setEndSuggestions([])
                    setEndLoading(false)
                  } else {
                    const json = await resp.json()
                    setEndSuggestions(json.features || [])
                    setEndLoading(false)
                  }
                } else {
                  setEndSuggestions([])
                  setShowEndDropdown(false)
                }
              }}
              className="pl-10 w-full py-3 h-12 text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[200px] sm:min-w-[320px] max-w-full"
            />
            {showEndDropdown && (endSuggestions.length > 0 || endLoading) && (
              <ul className="absolute z-20 left-0 right-0 bg-white border rounded shadow max-h-40 overflow-y-auto mt-1">
                {endLoading && <li className="p-2 text-xs text-gray-400">Caricamento…</li>}
                {endSuggestions.map((feat) => (
                  <li
                    key={feat.properties.place_id}
                    className="p-2 hover:bg-blue-100 cursor-pointer text-sm"
                    onMouseDown={() => {
                      setEndText(feat.properties.formatted)
                      setEndPoint({
                        lat: feat.properties.lat,
                        lon: feat.properties.lon,
                        name: feat.properties.formatted,
                      })
                      setShowEndDropdown(false)
                      setEndSuggestions([])
                      endInputRef.current.blur()
                    }}
                  >
                    {feat.properties.formatted}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">Se non selezioni una proposta, il testo digitato verrà geocodificato al submit.</p>
      </div>

      {/* Submit button to calculate route */}
      <button
        type="submit"
        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        Trova percorso
      </button>

      {/* Map container - Leaflet will attach to this div */}
      {/* The height is fixed to ensure the map is visible */}
      <div id="map" className="w-full h-[400px] rounded-lg mt-4" />
    </form>
  )
}

export default RouteSearchForm