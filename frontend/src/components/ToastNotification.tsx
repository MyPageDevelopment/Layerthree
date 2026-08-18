'use client'

import React, { createContext, useContext, useState } from 'react'

export interface ToastMessage {
  id: string
  title?: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', title?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    title?: string,
  ) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast: ToastMessage = { id, title, message, type }

    setToasts((prev) => [...prev, newToast])

    setTimeout(() => {
      removeToast(id)
    }, 4500)
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Render Container - Bottom Right Dropdown / Floating Cards */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col space-y-3 max-w-md w-full px-4 pointer-events-none">
        {toasts.map((toast) => {
          const bgColors = {
            success: 'bg-emerald-950/90 border-emerald-500 text-emerald-100',
            error: 'bg-rose-950/90 border-rose-500 text-rose-100',
            warning: 'bg-amber-950/90 border-amber-500 text-amber-100',
            info: 'bg-slate-900/95 border-blue-500 text-blue-100',
          }

          const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: '🔔',
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-y-0 flex items-start justify-between gap-3 ${bgColors[toast.type]}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{icons[toast.type]}</span>
                <div>
                  {toast.title && (
                    <h5 className="font-extrabold text-xs uppercase tracking-wider mb-0.5">
                      {toast.title}
                    </h5>
                  )}
                  <p className="text-xs font-semibold leading-relaxed">{toast.message}</p>
                </div>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white text-sm font-bold shrink-0 p-1"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe ser utilizado dentro de un ToastProvider')
  }
  return context
}
