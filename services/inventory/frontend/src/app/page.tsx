'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { hasModuleAccess } from '@/lib/auth'

export default function Home() {
  useEffect(() => {
    // Redirigir al login principal si no hay token
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      window.location.href = '/login.html';
    } else {
      const canUseInventory = hasModuleAccess('inventory');
      if (!canUseInventory) {
        window.location.href = '/dashboard.html';
      } else {
        window.location.href = '/inventory/dashboard';
      }
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Verificando autenticación...</p>
      </div>
    </div>
  )
}
