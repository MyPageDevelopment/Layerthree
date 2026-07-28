'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { hasModuleAccess, isAuthenticated } from '@/lib/auth'
import Navbar from '@/components/Navbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()

  useEffect(() => {
    if (!isAuthenticated()) {
      // Redirigir al login principal del sistema
      window.location.href = '/login.html'
      return
    }

    // Validar acceso al módulo de inventario
    if (!hasModuleAccess('inventory')) {
      window.location.href = '/dashboard.html'
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
