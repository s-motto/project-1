import React from 'react'
import { useToast } from '../contexts/ToastContext'
import Toast from './Toast'

// Componente ToastContainer
const ToastContainer = () => {
  const { toasts } = useToast() // Ottieni i toast dal contesto

  // Render del contenitore dei toast
  return (
    <div className="toast-container">
      <div className="toast-list">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </div>
  )
}

export default ToastContainer