'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'
import { isAuthenticated } from '@/lib/auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!isAuthenticated()) {
      router.replace('/login')
    }
  }, [router])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        Cargando...
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
            {children}
          </main>

          {/* Footer Component */}
          <footer className="w-full border-t border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-4 px-6 mt-auto">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-1.5">
                <span>📧 Soporte:</span>
                <a
                  href="mailto:mypage.development@gmail.com"
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  mypage.development@gmail.com
                </a>
              </div>

              <div className="flex items-center space-x-1">
                <span>Hecho con ❤️ por</span>
                <a
                  href="https://mypage.cl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  mypage.cl
                </a>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  )
}
