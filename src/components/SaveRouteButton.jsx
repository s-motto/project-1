import React, { useState } from 'react'
import { FaBookmark, FaCheck, FaSpinner } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'
import routesService from '../services/routesService'
import { useToast } from '../contexts/ToastContext'

// Componente SaveRouteButton per salvare un percorso
const SaveRouteButton = ({ routeData, onSaved }) => {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [routeName, setRouteName] = useState('')
  const { toast } = useToast()
  // Funzione per gestire il salvataggio del percorso
  const handleSave = async () => {
    if (!user) {
      toast.info('Devi essere loggato per salvare un percorso')
      return
    }

    if (!showNameInput) {
      setShowNameInput(true)
      return
    }

    if (!routeName.trim()) {
      toast.info('Inserisci un nome per il percorso')
      return
    }

    setSaving(true)
    const result = await routesService.saveRoute(
      { ...routeData, name: routeName },
      user.$id
    )

    if (result.success) {
      setSaved(true)
      setShowNameInput(false)
      // Estraggo l'id del percorso salvato e notifico il componente genitore in modo che possa persisterlo
      const savedId = result.data && (result.data.$id || result.data.id || result.data.$uid)
      if (onSaved) onSaved(savedId)
      setTimeout(() => setSaved(false), 3000)
    } else {
      toast.error('Errore nel salvataggio: ' + result.error)
    }
    setSaving(false)
  }

  if (!user) {
    return (
      <button
        onClick={() => toast.info('Effettua il login per salvare i percorsi')}
        className="btn-secondary w-full"
      >
        <FaBookmark />
        <span>Login per salvare</span>
      </button>
    )
  }

  if (saved) {
    return (
      <button
        disabled
        className="btn-green w-full"
      >
        <FaCheck />
        <span>Percorso salvato!</span>
      </button>
    )
  }

  return (
    <div className="w-full space-y-2">
      {showNameInput && (
        <input
          type="text"
          placeholder="Nome del percorso..."
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          className="input"
          autoFocus
        />
      )}
      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-save"
      >
        {saving ? (
          <>
            <FaSpinner className="spinner-sm" />
            <span>Salvataggio...</span>
          </>
        ) : (
          <>
            <FaBookmark />
            <span>{showNameInput ? 'Conferma salvataggio' : 'Salva percorso'}</span>
          </>
        )}
      </button>
    </div>
  )
}

export default SaveRouteButton