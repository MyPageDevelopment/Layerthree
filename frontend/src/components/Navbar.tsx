'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, logout } from '@/lib/auth'
import { useTheme } from '@/context/ThemeContext'
import { api } from '@/lib/api'
import type { User } from '@/types'

interface NotificationItem {
  id: string
  title: string
  message: string
  isRead: boolean
  link?: string
  createdAt: string
}

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const { theme, toggleTheme } = useTheme()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setUser(getUser())
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications')
      if (Array.isArray(res.data)) {
        setNotifications(res.data)
      }
    } catch {
      // Ignore unauthorized or network errors
    }
  }

  const handleNotificationClick = async (n: NotificationItem) => {
    try {
      if (!n.isRead) {
        await api.patch(`/notifications/${n.id}/read`)
        setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item))
      }
    } catch (e) {
      console.error(e)
    }

    setShowNotifications(false)
    if (n.link) {
      router.push(n.link)
    }
  }

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (e) {
      console.error(e)
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'

  const navLinks = [
    { name: 'Bodega / Inventario', href: '/bodega', icon: '📦', show: true },
    { name: 'Solicitudes / Pedidos', href: '/solicitudes', icon: '📑', show: true },
    { name: 'Calendario', href: '/calendario', icon: '📅', show: true },
    { name: 'Actividades', href: '/actividades', icon: '📋', show: true },
    { name: 'Gestión de Usuarios', href: '/usuarios', icon: '👥', show: user?.role === 'SUPER_ADMIN' },
  ]

  return (
    <header className="w-full sticky top-0 z-40 backdrop-blur-md bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-sm text-slate-900 dark:text-white">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Mobile Hamburger & Logo */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen)
                setShowNotifications(false)
                setShowUserMenu(false)
              }}
              className="p-2 rounded-xl text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 md:hidden transition border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-lg"
              title="Abrir menú"
            >
              <span>☰</span>
            </button>

            <Link href="/bodega" className="flex items-center space-x-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-md group-hover:scale-105 transition-transform">
                L3
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xs sm:text-base tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent leading-none sm:leading-normal">
                  INTRANET LAYERTHREE
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-slate-400 tracking-wider hidden sm:block">
                  Plataforma Corporativa
                </span>
              </div>
            </Link>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-xs font-semibold"
              title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
            >
              <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span className="hidden md:inline">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
            </button>

            {/* Notification Bell Dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications)
                    setShowUserMenu(false)
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition border border-slate-200 dark:border-slate-700 relative"
                  title="Notificaciones"
                >
                  <span className="text-base">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse shadow">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popup - Responsive Fixed bounds on Mobile */}
                {showNotifications && (
                  <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:mt-3 w-auto sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-4 space-y-3 max-h-[80vh] overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Notificaciones</h4>
                        {unreadCount > 0 && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                            {unreadCount} nuevas
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:underline"
                        >
                          Marcar leídas
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                      {notifications.length === 0 ? (
                        <p className="text-slate-400 py-6 text-center">No tienes notificaciones recibidas</p>
                      ) : (
                        notifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`p-3 rounded-xl border transition cursor-pointer hover:border-blue-500 ${
                              n.isRead
                                ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                                : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-slate-900 dark:text-white font-medium'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-bold text-xs">{n.title}</p>
                              {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-1.5">{n.message}</p>
                            <span className="text-[10px] text-slate-400 block">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Profile Pill & Dropdown */}
            {user && (
              <div className="relative border-l border-slate-200 dark:border-slate-800 pl-2 sm:pl-4">
                <button
                  onClick={() => {
                    setShowUserMenu(!showUserMenu)
                    setShowNotifications(false)
                  }}
                  className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow">
                    {userInitial}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                      {user.name || user.email.split('@')[0]}
                    </p>
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                      {user.role}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">▾</span>
                </button>

                {/* Profile Menu Dropdown */}
                {showUserMenu && (
                  <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-2 space-y-1 text-xs">
                    <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                      <p className="font-bold text-slate-900 dark:text-white">{user.name || 'Usuario'}</p>
                      <p className="text-slate-400 font-mono text-[11px] truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/bodega"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        <span>📦</span>
                        <span>Inventario y Bodega</span>
                      </Link>
                      <Link
                        href="/solicitudes"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                      >
                        <span>📑</span>
                        <span>Solicitudes de Materiales</span>
                      </Link>
                      {user.role === 'SUPER_ADMIN' && (
                        <Link
                          href="/usuarios"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-blue-600 dark:text-blue-400 font-semibold"
                        >
                          <span>👥</span>
                          <span>Gestión de Usuarios</span>
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-1">
                      <button
                        onClick={() => logout()}
                        className="w-full text-left flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 font-semibold transition"
                      >
                        <span>🚪</span>
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Navigation Drawer (Fix high contrast visible drawer) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          ></div>

          {/* Drawer Window */}
          <div className="relative bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-72 max-w-[85vw] h-full p-5 space-y-6 flex flex-col z-10 shadow-2xl border-r border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  L3
                </div>
                <span className="font-extrabold text-base text-slate-900 dark:text-white">Navegación Intranet</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-500 hover:text-slate-900 dark:hover:text-white text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <nav className="space-y-1.5 flex-1">
              {navLinks.filter(i => i.show).map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-3.5 rounded-xl text-sm font-bold transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {user && (
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow">
                    {userInitial}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{user.name || user.email}</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold uppercase">{user.role}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="w-full text-center py-3 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold rounded-xl text-xs border border-red-200 dark:border-red-800 shadow-sm"
                >
                  🚪 Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
