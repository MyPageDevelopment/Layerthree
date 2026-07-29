'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth'

export default function RootPage() {
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/bodega')
    } else {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="animate-pulse text-center">
        <span className="text-4xl mb-2 block">📦</span>
        <p className="text-slate-400">Cargando Sistema Intranet Layerthree...</p>
      </div>
    </div>
  )
}
