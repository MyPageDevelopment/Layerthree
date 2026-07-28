'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getUser, logout } from '@/lib/auth'
import type { User } from '@/types'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const handleLogout = () => {
    logout()
  }

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold">📊 Gestión de Proyectos</span>
            </Link>
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              <button
                type="button"
                onClick={() => (window.location.href = '/dashboard.html')}
                className="inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-blue-200 transition"
              >
                Menú principal
              </button>
              <Link
                href="/"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-blue-200 transition"
              >
                Dashboard
              </Link>
              <Link
                href="/proyectos"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-blue-200 transition"
              >
                Proyectos
              </Link>
              <Link
                href="/calendario"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-blue-200 transition"
              >
                Calendario
              </Link>
              <Link
                href="/mis-tareas"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium hover:text-blue-200 transition"
              >
                Mis Tareas
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-blue-200">
                    {user.role === 'SUPER_ADMIN' && 'Super Admin'}
                    {user.role === 'GERENTE' && 'Gerente'}
                    {user.role === 'JEFE' && 'Jefe'}
                    {user.role === 'TECNICO' && 'Técnico'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm font-medium transition"
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
