import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { account } from '../appwrite'
import { ID } from 'appwrite'
import logger from '../utils/logger'

const AuthContext = createContext() // Creo il contesto di autenticazione

// Hook per l'autenticazione
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

// Provider per il contesto di autenticazione
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Verifica se l'utente è già loggato
  useEffect(() => {
    checkUser()
  }, [])

  // Funzione per controllare l'utente corrente
  const checkUser = useCallback(async () => {
    try {
      const currentUser = await account.get()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // Login
  const login = useCallback(async (email, password) => {
    try {
      await account.createEmailPasswordSession(email, password)
      const currentUser = await account.get()
      setUser(currentUser)
      return { success: true }
    } catch (error) {
      logger.error('Login error:', error)
      return { success: false, error: error.message }
    }
  }, [])

  // Registrazione
  const register = useCallback(async (email, password, name) => {
    try {
      await account.create(ID.unique(), email, password, name)
      await login(email, password)
      return { success: true }
    } catch (error) {
      logger.error('Registration error:', error)
      return { success: false, error: error.message }
    }
  }, [login])

  // Logout
  const logout = useCallback(async () => {
    try {
      await account.deleteSession('current')
      setUser(null)
      return { success: true }
    } catch (error) {
      logger.error('Logout error:', error)
      return { success: false, error: error.message }
    }
  }, [])

  // Memoizza il value per evitare re-render non necessari nei consumer
  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    checkUser
  }), [user, loading, login, register, logout, checkUser])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}