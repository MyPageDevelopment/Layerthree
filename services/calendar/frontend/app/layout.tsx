import './globals.css'
import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import { ToastProvider } from '@/components/ToastProvider'

export const metadata: Metadata = {
  title: 'Gestión de Proyectos - Layerthree',
  description: 'Gestión de tiempos, calendario y proyectos Layerthree',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-100">
        <ToastProvider>
          <Navbar />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
