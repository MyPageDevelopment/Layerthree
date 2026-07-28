'use client'

import { useEffect } from 'react'

export default function LoginPage() {
  useEffect(() => {
    // Redirigir al login principal del sistema
    window.location.href = '/login.html'
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirigiendo al login principal...</p>
      </div>
    </div>
  )
}
