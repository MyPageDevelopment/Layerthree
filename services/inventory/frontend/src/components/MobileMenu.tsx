'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { logout, isAuthenticated } from '@/lib/auth'

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Solo mostrar el menú si está autenticado y no está en login
    const authenticated = isAuthenticated()
    setShowMenu(authenticated && pathname !== '/login')
  }, [pathname])

  const handleLogout = () => {
    logout()
    // La función logout ya redirige a /login.html
  }

  const menuItems = [
    { name: 'Menú principal', path: '/dashboard.html', icon: '🏠', external: true },
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Productos', path: '/productos', icon: '📦' },
    { name: 'Movimientos', path: '/movimientos', icon: '🔄' },
  ]

  const isActive = (path: string) => pathname === path

  if (!showMenu) return null

  return (
    <>
      {/* Barra Superior Fija - Solo Móvil */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary-600 to-primary-700 shadow-lg">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo/Título */}
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 p-2 rounded-lg">
              <span className="text-2xl">📦</span>
            </div>
            <div className="text-white">
              <h1 className="text-lg font-bold leading-tight">Bodega</h1>
              <p className="text-xs text-primary-100 leading-tight">Layerthree</p>
            </div>
          </div>

          {/* Botón Hamburguesa */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2.5 rounded-lg transition-all active:scale-95"
            aria-label="Menú"
          >
            {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menú Lateral */}
      <div
        className={`md:hidden fixed top-0 right-0 h-full w-72 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header del menú - Ahora con más espacio superior */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 pt-20 pb-6">
            <h2 className="text-2xl font-bold">Menú Principal</h2>
            <p className="text-sm text-primary-100 mt-1">Navegación</p>
          </div>

          {/* Items del menú */}
          <nav className="flex-1 overflow-y-auto py-4">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  if (item.external) {
                    window.location.href = item.path
                  } else {
                    router.push(item.path)
                  }
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="font-medium text-base">{item.name}</span>
              </button>
            ))}
          </nav>

          {/* Footer con logout */}
          <div className="border-t border-gray-200 p-4">
            <button
              onClick={() => {
                handleLogout()
                setIsOpen(false)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
