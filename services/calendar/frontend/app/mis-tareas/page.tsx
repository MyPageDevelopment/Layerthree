'use client'

import { useEffect, useState } from 'react'
import { requireAuth, requireModuleAccess, getToken, getUserData } from '@/lib/auth'
import Link from 'next/link'

interface Task {
  id: string
  code: string
  title: string
  description?: string
  status: string
  priority: string
  startDate?: string
  endDate?: string
  dueDate?: string
  progress: number
  project: {
    id: string
    code: string
    name: string
    status: string
  }
  assignments: Array<{
    id: string
    role: string
    user: {
      id: string
      name: string
      email: string
    }
  }>
  milestone?: {
    id: string
    name: string
    dueDate: string
  }
  _count: {
    subtasks: number
    comments: number
  }
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En Progreso',
  BLOCKED: 'Bloqueado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  BLOCKED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

export default function MisTareasPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    requireAuth()
    requireModuleAccess('projects')
    
    const userData = getUserData()
    if (userData?.id) {
      const uid = String(userData.id)
      setUserId(uid)
      loadMyTasks(uid)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMyTasks = async (uid: string, status?: string) => {
    setLoading(true)
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'
      
      let url = `${apiUrl}/tasks/user/${uid}/assigned`
      if (status && status !== 'all') {
        url += `?status=${status}`
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      } else {
        console.error('Error cargando tareas')
      }
    } catch (error) {
      console.error('Error cargando tareas:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status)
    if (userId) {
      loadMyTasks(userId, status !== 'all' ? status : undefined)
    }
  }

  const formatDate = (date?: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null
    const due = new Date(dueDate)
    const now = new Date()
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const getDueDateColor = (dueDate?: string) => {
    const days = getDaysUntilDue(dueDate)
    if (days === null) return ''
    if (days < 0) return 'text-red-600 font-semibold'
    if (days <= 3) return 'text-orange-600 font-semibold'
    if (days <= 7) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const activeTasks = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mis Tareas</h1>
              <p className="mt-2 text-gray-600">
                Tareas donde soy participante ({tasks.length} total, {activeTasks.length} activas)
              </p>
            </div>
            <Link
              href="/calendario"
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← Volver al Calendario
            </Link>
          </div>

          {/* Filtros */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => handleStatusFilterChange('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Todas ({tasks.length})
            </button>
            <button
              onClick={() => handleStatusFilterChange('PENDING')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'PENDING'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => handleStatusFilterChange('IN_PROGRESS')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              En Progreso
            </button>
            <button
              onClick={() => handleStatusFilterChange('COMPLETED')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === 'COMPLETED'
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Completadas ({completedTasks.length})
            </button>
          </div>
        </div>

        {/* Lista de tareas */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Cargando tareas...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay tareas</h3>
            <p className="mt-1 text-sm text-gray-500">
              No tienes tareas asignadas en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => {
              const daysUntilDue = getDaysUntilDue(task.dueDate)
              
              return (
                <div
                  key={task.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-mono text-gray-500">{task.code}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[task.status]}`}>
                          {STATUS_LABELS[task.status]}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {task.title}
                      </h3>

                      {task.description && (
                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          <span>{task.project.name}</span>
                        </div>

                        {task.dueDate && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className={getDueDateColor(task.dueDate)}>
                              Vence: {formatDate(task.dueDate)}
                              {daysUntilDue !== null && (
                                <span className="ml-1">
                                  ({daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} días atrasado` : `${daysUntilDue} días`})
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {task.milestone && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                            </svg>
                            <span>{task.milestone.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Progreso */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Progreso</span>
                          <span className="font-medium text-gray-900">{task.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Participantes y metadata */}
                      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                        <span>👥 {task.assignments.length} participantes</span>
                        {task._count.subtasks > 0 && (
                          <span>📋 {task._count.subtasks} subtareas</span>
                        )}
                        {task._count.comments > 0 && (
                          <span>💬 {task._count.comments} comentarios</span>
                        )}
                      </div>
                    </div>

                    <div className="ml-6">
                      <Link
                        href={`/calendario?taskId=${task.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Ver Detalle
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
