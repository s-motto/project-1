import React, { createContext, useContext, useState, useCallback } from 'react'

// Creazione del contesto Toast
const ToastContext = createContext()
// Hook personalizzato per usare il contesto Toast
export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
// Provider del contesto Toast
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([])
// Aggiungi un nuovo toast
  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random()
    const toast = { id, message, type, duration }
    
    setToasts(prev => [...prev, toast])
    
    // Auto-remove dopo duration
    setTimeout(() => {
      removeToast(id)
    }, duration)
    
    return id
  }, [])
// Rimuovi un toast per ID
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Helper methods
  const toast = {
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    info: (message, duration) => addToast(message, 'info', duration),
  }
// Fornisci il contesto ai componenti figli
  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
    </ToastContext.Provider>
  )
}