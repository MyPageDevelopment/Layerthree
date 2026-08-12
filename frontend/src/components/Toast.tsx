'use client'

import React, { useEffect } from 'react'

export interface ToastMessage {
  id?: string
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
}

interface ToastProps {
  toast: ToastMessage | null
  onClose: () => void
  duration?: number
}

export default function Toast({ toast, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [toast, duration, onClose])

  if (!toast) return null

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  }

  const styles = {
    success: 'bg-slate-900/95 dark:bg-slate-900/95 border-emerald-500/50 text-emerald-300 shadow-emerald-900/20',
    error: 'bg-slate-900/95 dark:bg-slate-900/95 border-red-500/50 text-red-300 shadow-red-900/20',
    warning: 'bg-slate-900/95 dark:bg-slate-900/95 border-amber-500/50 text-amber-300 shadow-amber-900/20',
    info: 'bg-slate-900/95 dark:bg-slate-900/95 border-blue-500/50 text-blue-300 shadow-blue-900/20',
  }

  return (
    <div className="fixed top-5 right-5 z-[99999] max-w-sm w-[calc(100vw-2.5rem)] animate-bounce-in">
      <div className={`flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-2xl transition-all ${styles[toast.type]}`}>
        <span className="text-xl shrink-0 mt-0.5">{icons[toast.type]}</span>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <h5 className="font-bold text-sm text-white tracking-tight mb-0.5">{toast.title}</h5>
          )}
          <p className="text-xs text-slate-200 leading-relaxed break-words">{toast.message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors shrink-0"
          title="Cerrar"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
