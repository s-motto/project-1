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
  const styles = {
    success: 'bg-green-50 border-green-400 text-green-800',
    error: 'bg-red-50 border-red-400 text-red-800',
    warning: 'bg-yellow-50 border-yellow-400 text-yellow-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800'
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
    <div 
      className={`
        ${styles[type]} 
        border-l-4 rounded-lg shadow-lg p-4 mb-3
        flex items-center justify-between space-x-3
        animate-slide-in-right
        min-w-[320px] max-w-md
      `}
    >
      <div className="flex items-center space-x-3">
        <div className={iconColors[type]}>
          {icons[type]}
        </div>
        <p className="font-medium text-sm">{message}</p>
      </div>
      
      <button
        onClick={() => removeToast(id)}
        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
      >
        <FaTimes />
      </button>
    </div>
  )
}

export default Toast