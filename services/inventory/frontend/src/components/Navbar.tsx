'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUser, logout, isAdmin } from '@/lib/auth'
import type { User } from '@/types'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const handleLogout = () => {
    logout()
  }

  return (
    <nav className="bg-primary-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold">📦 Bodega Layerthree</span>
            </Link>
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              <button
                type="button"
                onClick={() => (window.location.href = '/dashboard.html')}
                className="inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-primary-200"
              >
                Menú principal
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-primary-200"
              >
                Dashboard
              </Link>
              <Link
                href="/productos"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-primary-200"
              >
                Productos
              </Link>
              <Link
                href="/movimientos"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-primary-200"
              >
                Movimientos
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-primary-200">
                    {user.role === 'SUPER_ADMIN' && 'Super Admin'}
                    {user.role === 'GERENTE' && 'Gerente'}
                    {user.role === 'JEFE' && 'Jefe de Proyecto'}
                    {user.role === 'TECNICO' && 'Técnico'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-primary-700 hover:bg-primary-800 px-4 py-2 rounded-md text-sm font-medium transition"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
