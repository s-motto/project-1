import React, { useState } from 'react'
import { FaUser, FaSignOutAlt, FaBookmark, FaChevronDown, FaChartLine } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'
import AuthPage from './AuthPage'
import Dashboard from './Dashboard'

// Componente UserMenu per la gestione dell'utente
const UserMenu = ({ onShowSavedRoutes }) => {
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
// Gestore del logout
  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      setShowMenu(false)
    }
  }

  // Se l'utente non è autenticato, mostro il button di login
  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="btn-primary"
        >
          <FaUser />
          <span>Accedi</span>
        </button>

        {showAuthModal && (
          <AuthPage onClose={() => setShowAuthModal(false)} />
        )}
      </>
    )
  }

  // Se l'utente è autenticato, mostro il menu utente completo
  return (
    <>
    <div className="relative">
      {/* Bottone con avatar e nome utente */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="user-menu-button"
      >
        {/* Avatar con iniziale del nome */}
        <div className="user-avatar">
          {user.name ? user.name[0].toUpperCase() : 'U'}
        </div>
        {/* Nome utente (nascosto su mobile) */}
        <span className="hidden sm:inline">{user.name || user.email}</span>
        {/* Icona freccia */}
        <FaChevronDown className="text-sm" />
      </button>

      {/* Menu a tendina */}
      {showMenu && (
        <>
          {/* Backdrop trasparente per chiudere il menu cliccando fuori */}
          <div 
            className="fixed inset-0 z-30"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Card del menu a tendina */}
          <div className="user-dropdown">
            {/* Sezione info utente */}
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>

            {/* Bottone "Dashboard" */}
              <button
                onClick={() => {
                  setShowMenu(false)
                  setShowDashboard(true)
                }}
                className="user-dropdown-item"
              >
                <FaChartLine className="w-4" />
                <span>Dashboard</span>
              </button>

            {/* Bottone "Percorsi salvati" */}
            <button
              onClick={() => {
                setShowMenu(false)
                if (onShowSavedRoutes) onShowSavedRoutes()
              }}
              className="user-dropdown-item"
            >
              <FaBookmark className="w-4" />
              <span>Percorsi salvati</span>
            </button>

            {/* Bottone di logout */}
            <button
              onClick={handleLogout}
              className="user-dropdown-item text-red-600 hover:bg-red-50 border-t border-gray-200"
            >
              <FaSignOutAlt className="w-4" />
              <span>Esci</span>
            </button>
          </div>
        </>
      )}
    </div>
    {/* Modal Dashboard */}
      {showDashboard && (
        <Dashboard onClose={() => setShowDashboard(false)} />
      )}
    </>
  )
}

export default UserMenu