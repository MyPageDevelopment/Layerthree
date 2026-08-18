'use client'

import React from 'react'

interface ConfirmModalProps {
  isOpen: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title = 'Confirmación',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null

  const btnVariant =
    variant === 'danger'
      ? 'bg-rose-600 hover:bg-rose-500 text-white'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-500 text-white'
      : 'bg-blue-600 hover:bg-blue-500 text-white'

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {variant === 'danger' ? '⚠️' : variant === 'warning' ? '❓' : 'ℹ️'}
            </span>
            <h4 className="font-extrabold text-base text-slate-900 dark:text-white">{title}</h4>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-white text-lg">
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 font-bold rounded-xl text-xs transition shadow-lg ${btnVariant}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
