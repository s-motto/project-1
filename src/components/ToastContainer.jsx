import React from 'react'
import { useToast } from '../contexts/ToastContext'
import Toast from './Toast'
// Componente ToastContainer
const ToastContainer = () => {
  const { toasts } = useToast()// Ottieni i toast dal contesto
// Render del contenitore dei toast
  return (
    <div className="fixed top-4 right-4 z-[9999] pointer-events-none">
      <div className="flex flex-col items-end space-y-2 pointer-events-auto">
        {toasts.map(toast => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </div>
  )
}

export default ToastContainer