'use client'

import { Suspense } from 'react'
import CalendarioContent from './CalendarioContent'

export default function CalendarioPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Cargando calendario...</div>}>
      <CalendarioContent />
    </Suspense>
  )
}
