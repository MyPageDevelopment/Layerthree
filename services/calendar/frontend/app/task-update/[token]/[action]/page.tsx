'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Task {
  id: string
  code: string
  title: string
  description?: string
  status: string
  priority: string
  project: {
    name: string
    code: string
  }
}

interface TokenData {
  task: Task
  user: {
    name: string
    email: string
  }
  expiresAt: string
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completada',
  BLOCKED: 'Bloqueada',
  CANCELLED: 'Cancelada',
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  BLOCKED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

export default function TaskUpdatePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const action = params.action as string
  
  const [tokenData, setTokenData] = useState<TokenData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    validateToken()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const validateToken = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'
      const response = await fetch(`${apiUrl}/task-update-tokens/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Token inválido o expirado')
      }

      const data = await response.json()
      setTokenData(data)
    } catch (err: any) {
      setError(err.message || 'Error al validar el token')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!token || !action) return

    setUpdating(true)
    setError(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'
      const response = await fetch(`${apiUrl}/task-update-tokens/update-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          status: action.toUpperCase(),
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al actualizar la tarea')
      }

      setSuccess(true)
      
      // Redirigir después de 3 segundos
      setTimeout(() => {
        router.push('/task-update-success')
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la tarea')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validando enlace...</p>
        </div>
      </div>
    )
  }

  if (error && !tokenData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Enlace No Válido</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Este enlace puede haber expirado o ya fue utilizado. Por favor, contacta a tu supervisor si necesitas actualizar el estado de la tarea.
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Tarea Actualizada!</h2>
          <p className="text-gray-600 mb-6">
            El estado de la tarea ha sido actualizado correctamente.
          </p>
          <div className="text-sm text-gray-500">
            Redirigiendo...
          </div>
        </div>
      </div>
    )
  }

  if (!tokenData) return null

  const actionLabel: Record<string, string> = {
    IN_PROGRESS: '🚀 Marcar en Progreso',
    COMPLETED: '✅ Marcar Completada',
    BLOCKED: '⚠️ Reportar Problema',
  }

  const actionColor: Record<string, string> = {
    IN_PROGRESS: 'from-blue-600 to-blue-700',
    COMPLETED: 'from-green-600 to-green-700',
    BLOCKED: 'from-red-600 to-red-700',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${actionColor[action.toUpperCase()] || 'from-gray-600 to-gray-700'} text-white p-6`}>
          <h1 className="text-2xl font-bold mb-2">
            {actionLabel[action.toUpperCase()] || 'Actualizar Tarea'}
          </h1>
          <p className="text-blue-100">Confirma la acción para actualizar el estado de la tarea</p>
        </div>

        {/* Task Info */}
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {tokenData.task.title}
            </h2>
            {tokenData.task.code && (
              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium mb-3">
                {tokenData.task.code}
              </span>
            )}
            {tokenData.task.description && (
              <p className="text-gray-600 mt-2">{tokenData.task.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500 mb-1">Proyecto</p>
              <p className="font-medium text-gray-800">
                {tokenData.task.project.code} - {tokenData.task.project.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Estado Actual</p>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[tokenData.task.status] || 'bg-gray-100 text-gray-800'}`}>
                {statusLabels[tokenData.task.status] || tokenData.task.status}
              </span>
            </div>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Asignado a:</strong> {tokenData.user.name} ({tokenData.user.email})
            </p>
          </div>

          {/* Notes Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentarios (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Agrega cualquier nota o comentario sobre el estado de la tarea..."
            />
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              disabled={updating}
            >
              Cancelar
            </button>
            <button
              onClick={handleUpdate}
              disabled={updating}
              className={`flex-1 px-6 py-3 bg-gradient-to-r ${actionColor[action.toUpperCase()] || 'from-gray-600 to-gray-700'} text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50`}
            >
              {updating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Actualizando...
                </span>
              ) : (
                'Confirmar Actualización'
              )}
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-500 text-center">
            Este enlace expira el {new Date(tokenData.expiresAt).toLocaleDateString('es-CL', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
