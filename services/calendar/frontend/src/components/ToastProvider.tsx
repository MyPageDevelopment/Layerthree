'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import Toast, { ToastType } from './Toast'

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showWarning: (message: string) => void
  showInfo: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

interface ToastData {
  id: number
  message: string
  type: ToastType
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const [nextId, setNextId] = useState(1)

  const showToast = (message: string, type: ToastType) => {
    const id = nextId
    setNextId(prev => prev + 1)
    setToasts(prev => [...prev, { id, message, type }])
  }

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const showSuccess = (message: string) => showToast(message, 'success')
  const showError = (message: string) => showToast(message, 'error')
  const showWarning = (message: string) => showToast(message, 'warning')
  const showInfo = (message: string) => showToast(message, 'info')

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </ToastContext.Provider>
  )
}
