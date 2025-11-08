import React, { useState } from 'react'
import { FaUser, FaSignOutAlt, FaBookmark, FaChevronDown, FaChartLine, FaCog } from 'react-icons/fa'
import { useAuth } from '../contexts/AuthContext'
import AuthPage from './AuthPage'
import Dashboard from './Dashboard'
import SettingsModal from './SettingsModal'

// Componente UserMenu per la gestione dell'utente
const UserMenu = ({ onShowSavedRoutes }) => {
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

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
              <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {user.name}
                </p>
                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {user.email}
                </p>
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

              {/* Bottone "Impostazioni" */}
              <button
                onClick={() => {
                  setShowMenu(false)
                  setShowSettings(true)
                }}
                className="user-dropdown-item"
              >
                <FaCog className="w-4" />
                <span>Impostazioni</span>
              </button>

              {/* Bottone di logout */}
              <button
                onClick={handleLogout}
                className="user-dropdown-item text-red-600 hover:bg-red-50 border-t"
                style={{ borderColor: 'var(--border-color)' }}
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
      
      {/* Modal Settings */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  )
}

export default UserMenu