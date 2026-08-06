'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getUser } from '@/lib/auth'
import type { User } from '@/types'

export default function Sidebar() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setUser(getUser())
  }, [])

  const navItems = [
    {
      name: 'Bodega / Inventario',
      href: '/bodega',
      icon: '📦',
      show: true,
    },
    {
      name: 'Solicitudes / Pedidos',
      href: '/solicitudes',
      icon: '📑',
      show: true,
    },
    {
      name: 'Cotizaciones',
      href: '/cotizaciones',
      icon: '📝',
      show: true,
    },
    {
      name: 'Calendario',
      href: '/calendario',
      icon: '📅',
      show: true,
    },
    {
      name: 'Actividades',
      href: '/actividades',
      icon: '📋',
      show: true,
    },
    {
      name: 'Stock Camionetas',
      href: '/camionetas',
      icon: '🛻',
      show: true,
    },
    {
      name: 'Gestión de Usuarios',
      href: '/usuarios',
      icon: '👥',
      show: user?.role === 'SUPER_ADMIN',
    },
  ]

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 p-4 hidden md:block transition-colors duration-200">
      <div className="space-y-6">
        <div>
          <h2 className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold px-3 mb-2">
            Módulos del Sistema
          </h2>
          <nav className="space-y-1">
            {navItems.filter(i => i.show).map((item) => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </aside>
  )
}
