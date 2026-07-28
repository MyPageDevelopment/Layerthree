import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import MobileMenu from '@/components/MobileMenu'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Control de Bodega - Telecomunicaciones',
  description: 'Sistema de gestión de inventario para empresa de telecomunicaciones',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <MobileMenu />
        {children}
      </body>
    </html>
  )
}
