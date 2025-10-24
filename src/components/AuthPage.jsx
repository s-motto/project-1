import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faLock, faEnvelope, faSpinner, faHiking } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../contexts/AuthContext'

const AuthPage = ({ onClose }) => {
  const { login, register } = useAuth() //Recupera le funzioni di login e registrazione dal contesto
  const [isLogin, setIsLogin] = useState(true) //Stato per alternare tra login e registrazione
  const [loading, setLoading] = useState(false) //Stato di caricamento durante l'invio del form
  const [error, setError] = useState('') //Stato per memorizzare eventuali messaggi di errore
  
  const [formData, setFormData] = useState({ //Stato per i dati del form
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

   // Effetto per nascondere i marker della mappa quando il modale è aperto
  useEffect(() => {
    // Aggiungi una classe al body per nascondere i marker
    document.body.classList.add('modal-open')
    
    // Cleanup: rimuovi la classe quando il componente viene smontato
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])

  //Gestore per aggiornare i dati del form
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('') // Reset errore quando l'utente modifica i campi
  }

  //Controlla che email e password siano valide
  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email e password sono obbligatori')
      return false
    }
// Ulteriori controlli per la registrazione
    if (!isLogin) {
        // Controllo che il nome non sia vuoto
      if (!formData.name) {
        setError('Il nome è obbligatorio')
        return false
      }
      // Controllo che le password corrispondano e abbiano una lunghezza minima
      if (formData.password !== formData.confirmPassword) {
        setError('Le password non corrispondono')
        return false
      }
      if (formData.password.length < 8) {
        setError('La password deve essere di almeno 8 caratteri')
        return false
      }
    }

    return true // Tutti i controlli sono passati
  }

  //Prevengo il comportamento di default del form e gestisco l'invio
  const handleSubmit = async (e) => {
    e.preventDefault()
    //Valido i dati del form
    if (!validateForm()) return

    setLoading(true) //Mostro lo stato di caricamento
    setError('') //Resetto eventuali errori precedenti

    try {
      let result
      if (isLogin) {
        //chiamo la funzione di login
        result = await login(formData.email, formData.password)
      } else {
        //chiamo la funzione di registrazione
        result = await register(formData.email, formData.password, formData.name)
      }

      if (result.success) {
        //Se l'operazione ha successo, chiudo la modale
        if (onClose) onClose()
      } else {
    //se c'è un errore, lo mostro all'utente
        setError(result.error || 'Errore durante l\'autenticazione')
      }
    } catch (err) {
        //gestisco gli errori imprevisti
      setError('Si è verificato un errore imprevisto')
    }

    setLoading(false) //Nascondo lo spinner
  }

  //Funzione per alternare tra login e registrazione
  const toggleMode = () => {
    setIsLogin(!isLogin) //cambio modalità
    setError('') //resetto errori
    setFormData({
        //resetto i dati del form
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    })
  }

  return (
    //Overlay modale
    //Imposto z-index alto per essere sopra altri elementi
    <div className="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header con icona e titolo */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-400 p-6 text-white">
          <div className="flex items-center justify-center mb-2">
            <FontAwesomeIcon icon={faHiking} className="text-4xl" />
          </div>
          <h2 className="text-2xl font-bold text-center">
            {isLogin ? 'Bentornato!' : 'Crea Account'}
          </h2>
          <p className="text-center text-blue-100 text-sm mt-1">
            {isLogin ? 'Accedi per salvare i tuoi percorsi' : 'Registrati per iniziare'}
          </p>
        </div>

        {/* Form di login/registrazione*/}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Campo nome visibile solo in registrazione */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome
              </label>
              <div className="relative">
                <FontAwesomeIcon 
                  icon={faUser} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Il tuo nome"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Campo email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <FontAwesomeIcon 
                icon={faEnvelope} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@esempio.com"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Campo password*/}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <FontAwesomeIcon 
                icon={faLock} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Conferma della password-visibile solo in registrazione */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conferma Password
              </label>
              <div className="relative">
                <FontAwesomeIcon 
                  icon={faLock} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Messaggio di errore (solo se esiste un errore) */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Button per l'invio del form*/}
          <button
            type="submit"
            disabled={loading} //Disabilito il button durante il caricamento
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
                //Spinner di caricamento
              <>
              
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                <span>Caricamento...</span>
              </>
            ) : (
              <span>{isLogin ? 'Accedi' : 'Registrati'}</span>
            )}
          </button>

          {/* Link per alternare tra login e registrazione */}
          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {isLogin 
                ? "Non hai un account? Registrati" 
                : "Hai già un account? Accedi"}
            </button>
          </div>

          {/* Button di chiusura della modale */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-full text-gray-600 hover:text-gray-800 text-sm font-medium py-2"
            >
              Chiudi
            </button>
          )}
        </form>
      </div>
    </div>
  )
}

export default AuthPage