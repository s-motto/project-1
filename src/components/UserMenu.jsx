import React, { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faSignOutAlt, faBookmark, faChevronDown } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../contexts/AuthContext'
import AuthPage from './AuthPage'

const UserMenu = ({ onShowSavedRoutes }) => {
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      setShowMenu(false)
    }
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowAuthModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
        >
          <FontAwesomeIcon icon={faUser} />
          <span>Accedi</span>
        </button>

        {showAuthModal && (
          <AuthPage onClose={() => setShowAuthModal(false)} />
        )}
      </>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="bg-white hover:bg-gray-50 border border-gray-300 px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
      >
        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
          {user.name ? user.name[0].toUpperCase() : 'U'}
        </div>
        <span className="hidden sm:inline">{user.name || user.email}</span>
        <FontAwesomeIcon icon={faChevronDown} className="text-sm" />
      </button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-30"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-40">
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>

            <button
              onClick={() => {
                setShowMenu(false)
                if (onShowSavedRoutes) onShowSavedRoutes()
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 text-gray-700"
            >
              <FontAwesomeIcon icon={faBookmark} className="w-4" />
              <span>Percorsi salvati</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center space-x-2 text-red-600 border-t border-gray-200"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="w-4" />
              <span>Esci</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default UserMenu