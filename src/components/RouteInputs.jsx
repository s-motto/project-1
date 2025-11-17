import React from 'react'
import { FaMapMarkerAlt, FaFlag, FaLocationArrow, FaSpinner } from 'react-icons/fa'

/**
 * Componente RouteInputs - Form per la ricerca di un percorso con autocomplete
 */
const RouteInputs = ({
  startText,
  endText,
  startSuggestions,
  endSuggestions,
  startLoading,
  endLoading,
  showStartDropdown,
  showEndDropdown,
  isPreloaded,
  gettingLocation,
  loading,
  errorMsg,
  startInputRef,
  endInputRef,
  onStartTextChange,
  onEndTextChange,
  onStartFocus,
  onStartBlur,
  onEndFocus,
  onEndBlur,
  onSelectStartSuggestion,
  onSelectEndSuggestion,
  onGetCurrentLocation,
  onSubmit
}) => {
  return (
    <form onSubmit={onSubmit} className="route-search-form">
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
              onFocus={onStartFocus}
              onBlur={onStartBlur}
              onChange={onStartTextChange}
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
                    onMouseDown={() => onSelectStartSuggestion(suggestion)}
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
          onClick={onGetCurrentLocation}
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

      {/* Input punto di arrivo */}
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
              onFocus={onEndFocus}
              onBlur={onEndBlur}
              onChange={onEndTextChange}
              className="route-input"
            />
            {showEndDropdown && (endSuggestions.length > 0 || endLoading) && (
              <ul className="route-suggestions-dropdown">
                {endLoading && <li className="route-suggestion-loading">Caricamento…</li>}
                {endSuggestions.map((suggestion) => (
                  <li
                    key={suggestion.place_id}
                    className="route-suggestion-item"
                    onMouseDown={() => onSelectEndSuggestion(suggestion)}
                  >
                    {suggestion.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        
        {/* Spacer per allineamento con bottone GPS */}
        <div className="w-12 h-12"></div>
      </div>

      {/* Messaggio di errore */}
      {errorMsg && (
        <div className="route-error-message">
          {errorMsg}
        </div>
      )}

      {/* Bottone Submit */}
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
  )
}

export default RouteInputs