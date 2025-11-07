import React, { useState, useEffect } from 'react' // importo React e gli hook necessari
import { FaUser, FaLock, FaEnvelope, FaSpinner, FaHiking } from 'react-icons/fa' // importo le icone necessarie
import { useAuth } from '../contexts/AuthContext' // importo il contesto di autenticazione
// Componente AuthPage per login e registrazione
const AuthPage = ({ onClose }) => {
  const { login, register } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Stato per i dati del form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
// Effetto per gestire la classe del body quando il modal è aperto
  useEffect(() => {
    document.body.classList.add('modal-open')
    return () => {
      document.body.classList.remove('modal-open')
    }
  }, [])
// Gestore del cambiamento nei campi del form
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }
// Funzione di validazione del form
  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email e password sono obbligatori')
      return false
    }
// Validazioni aggiuntive per la registrazione
    if (!isLogin) {
      if (!formData.name) {
        setError('Il nome è obbligatorio')
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Le password non corrispondono')
        return false
      }
      if (formData.password.length < 8) {
        setError('La password deve essere di almeno 8 caratteri')
        return false
      }
    }

    return true
  }
// Gestore del submit del form
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true) // Avvio caricamento
    setError('')// Reset errore
    // Chiamata alle funzioni di login o registrazione
    try {
      let result
      if (isLogin) {
        result = await login(formData.email, formData.password)
      } else {
        result = await register(formData.email, formData.password, formData.name)
      }

      if (result.success) {
        if (onClose) onClose()
      } else {
        setError(result.error || 'Errore durante l\'autenticazione')
      }
    } catch (err) {
      setError('Si è verificato un errore imprevisto')
    }

    setLoading(false)
  }
  // Funzione per il toggle tra login e registrazione
  const toggleMode = () => {
    setIsLogin(!isLogin)
    setError('')
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    })
  }
  // Render del componente
  return (
    <div className="modal-overlay" style={{isolation: 'isolate'}}>
      <div className="modal-content max-w-md">
        {/* Header */}
        <div className="modal-header-primary">
          <div className="flex items-center justify-center mb-2">
            <FaHiking className="text-4xl" />
          </div>
          <h2 className="text-2xl font-bold text-center">
            {isLogin ? 'Bentornato!' : 'Crea Account'}
          </h2>
          <p className="text-center text-blue-100 text-sm mt-1">
            {isLogin ? 'Accedi per salvare i tuoi percorsi' : 'Registrati per iniziare'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-body">
          {/* Campo nome (solo registrazione) */}
          {!isLogin && (
            <div className="form-group">
              <label className="label">Nome</label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Il tuo nome"
                  className="input-with-icon"
                />
              </div>
            </div>
          )}

          {/* Campo email */}
          <div className="form-group">
            <label className="label">Email</label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="email@esempio.com"
                className="input-with-icon"
              />
            </div>
          </div>

          {/* Campo password */}
          <div className="form-group">
            <label className="label">Password</label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="input-with-icon"
              />
            </div>
          </div>

          {/* Conferma password (solo registrazione) */}
          {!isLogin && (
            <div className="form-group">
              <label className="label">Conferma Password</label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="input-with-icon"
                />
              </div>
            </div>
          )}

          {/* Messaggio di errore */}
          {error && (
            <div className="alert-error">
              {error}
            </div>
          )}

          {/* Button submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <>
                <FaSpinner className="spinner-sm" />
                <span>Caricamento...</span>
              </>
            ) : (
              <span>{isLogin ? 'Accedi' : 'Registrati'}</span>
            )}
          </button>

          {/* Toggle login/registrazione */}
          <div className="text-center">
            <button
              type="button"
              onClick={toggleMode}
              className="text-link"
            >
              {isLogin 
                ? "Non hai un account? Registrati" 
                : "Hai già un account? Accedi"}
            </button>
          </div>

          {/* Button chiudi */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost w-full"
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