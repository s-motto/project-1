import React, { useState } from 'react'
import { FaUser, FaSignOutAlt, FaBookmark, FaChevronDown } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'
import AuthPage from './AuthPage'

const UserMenu = ({ onShowSavedRoutes }) => {
    //Recupero l'utente corrente e la funzione di logout dal contesto di autenticazione
  const { user, logout } = useAuth()
  //Stati per gestire l'interfaccia del menu utente
  const [showMenu, setShowMenu] = useState(false) //Mostro/nascondo il menu a tendina
  const [showAuthModal, setShowAuthModal] = useState(false) //Mostro/nascondo la modale di autenticazione

  const handleLogout = async () => {
    //Chiamo la funzione di logout
    const result = await logout()
    if (result.success) {
      setShowMenu(false) //Chiudo il menu dopo il logout
    }
  }
//Se l'utente non è autenticato, mostro il button di login
  if (!user) {
    return (
      <>
      {/* Bottone per aprire il modale di login */}
        <button
          onClick={() => setShowAuthModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
        >
          <FaUser />
          <span>Accedi</span>
        </button>
{/* Modale di login/registrazione visibile solo se showAuthModal è true */}
        {showAuthModal && (
          <AuthPage onClose={() => setShowAuthModal(false)} />
        )}
      </>
    )
  }
//Se l'utente è autenticato, mostro il menu utente completo
  return (
    <div className="relative">
         {/* Bottone con avatar e nome utente */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="bg-white hover:bg-gray-50 border border-gray-300 px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
      >
         {/* Avatar con iniziale del nome */}
        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
          {user.name ? user.name[0].toUpperCase() : 'U'}
        </div>
         {/* Nome utente (nascosto su mobile) */}
        <span className="hidden sm:inline">{user.name || user.email}</span>
        {/* Icona freccia */}
        <FaChevronDown className="text-sm" />
      </button>

 {/* Menu a tendina (visibile solo se showMenu è true) */}
      {showMenu && (
        <>
          {/* Backdrop trasparente per chiudere il menu cliccando fuori*/}
          <div 
            className="fixed inset-0 z-30"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Card del menu a tendina con z-index aumentato in modo da farlo rimanere sopra il resto della pagina */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
            {/* Sezione info utente */}
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>

{/* Bottone "Percorsi salvati" */}
            <button
              onClick={() => {
                setShowMenu(false) //Chiudo il menu
                if (onShowSavedRoutes) onShowSavedRoutes() //Mostro i percorsi salvati
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-gray-700"
            >
              <FaBookmark className="w-4" />
              <span>Percorsi salvati</span>
            </button>

            {/* Bottone di logout */}
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center space-x-2 text-red-600 border-t border-gray-200"
            >
              <FaSignOutAlt className="w-4" />
              <span>Esci</span>
            </button>
          </div>
        </>
      )}
    </div>

  )
}

export default UserMenu