import React, { createContext, useContext, useState, useEffect } from 'react'
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
  const checkUser = async () => {
    try {
      const currentUser = await account.get()
      setUser(currentUser)
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // Login
  const login = async (email, password) => {
    try {
      await account.createEmailPasswordSession(email, password)
      const currentUser = await account.get()
      setUser(currentUser)
      return { success: true }
    } catch (error) {
      logger.error('Login error:', error)
      return { success: false, error: error.message }
    }
  }

  // Registrazione
  const register = async (email, password, name) => {
    try {
      await account.create(ID.unique(), email, password, name)
      await login(email, password)
      return { success: true }
    } catch (error) {
      logger.error('Registration error:', error)
      return { success: false, error: error.message }
    }
  }

  // Logout
  const logout = async () => {
    try {
      await account.deleteSession('current')
      setUser(null)
      return { success: true }
    } catch (error) {
      logger.error('Logout error:', error)
      return { success: false, error: error.message }
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    checkUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}