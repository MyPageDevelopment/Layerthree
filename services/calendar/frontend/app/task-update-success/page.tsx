'use client'

import Link from 'next/link'

export default function TaskUpdateSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          ¡Tarea Actualizada!
        </h1>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          El estado de la tarea ha sido actualizado exitosamente. Tu supervisor y el equipo han sido notificados del cambio.
        </p>

        <div className="space-y-3">
          <Link
            href="/projects/mis-tareas"
            className="block w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Ver Mis Tareas
          </Link>
          
          <Link
            href="/projects/calendario"
            className="block w-full px-6 py-3 border-2 border-green-600 text-green-700 rounded-lg font-medium hover:bg-green-50 transition-colors"
          >
            Ir al Calendario
          </Link>
        </div>

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Tip:</strong> Puedes cerrar esta ventana de forma segura. El enlace utilizado ya no está activo.
          </p>
        </div>
      </div>
    </div>
  )
}
