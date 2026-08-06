'use client'

import React from 'react'

interface LoadingOverlayProps {
  isOpen: boolean
  message?: string
}

export default function LoadingOverlay({ isOpen, message = 'Procesando...' }: LoadingOverlayProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4 z-[9999] animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center max-w-sm w-full text-center space-y-4">
        {/* Animated Double Ring Spinner */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <div className="absolute inset-2 rounded-full border-4 border-indigo-500/20 border-b-indigo-400 animate-spin-reverse" />
          <span className="text-xl">📦</span>
        </div>

        {/* Status Message */}
        <div>
          <h4 className="text-base font-bold text-white tracking-wide">{message}</h4>
          <p className="text-xs text-slate-400 mt-1">Por favor espera un momento...</p>
        </div>
      </div>
    </div>
  )
}
