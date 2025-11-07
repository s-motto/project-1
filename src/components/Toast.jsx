import React from 'react'
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa'
import { useToast } from '../contexts/ToastContext'

// Componente Toast
const Toast = ({ id, message, type }) => {
  const { removeToast } = useToast()

  // Icone per tipo di toast
  const icons = {
    success: <FaCheckCircle className="text-xl" />,
    error: <FaExclamationCircle className="text-xl" />,
    warning: <FaExclamationCircle className="text-xl" />,
    info: <FaInfoCircle className="text-xl" />
  }

  // Stili per tipo di toast
  const toastClasses = {
    success: 'toast-success',
    error: 'toast-error',
    warning: 'toast-warning',
    info: 'toast-info'
  }

  // Colori icone per tipo di toast
  const iconColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600'
  }

  // Render del toast
  return (
    <div className={`toast-base ${toastClasses[type]}`}>
      <div className="space-x-3-items">
        <div className={iconColors[type]}>
          {icons[type]}
        </div>
        <p className="font-medium text-sm">{message}</p>
      </div>
      
      <button
        onClick={() => removeToast(id)}
        className="toast-close-btn"
      >
        <FaTimes />
      </button>
    </div>
  )
}

export default Toast