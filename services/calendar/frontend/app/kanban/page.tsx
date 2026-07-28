'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getUser, getUserData } from '@/lib/auth'
import { canChangeStatus } from '@/lib/permissions'

interface Task {
  id: string
  code: string
  title: string
  description?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  startDate: string
  endDate: string
  progress: number
  projectId: string
  project?: {
    id: string
    code: string
    name: string
  }
}

export default function KanbanPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  useEffect(() => {
    const userData = getUserData()
    if (!userData) {
      router.push('/login')
      return
    }
    setUser(userData)
    loadTasks()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(`${apiUrl}/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error cargando tareas:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(`${apiUrl}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        // Actualizar estado local
        setTasks(tasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus as Task['status'] } : task
        ))
      } else {
        const error = await response.json()
        alert(error.message || 'Error al actualizar el estado de la tarea')
      }
    } catch (error) {
      console.error('Error actualizando tarea:', error)
      alert('Error al actualizar el estado de la tarea')
    }
  }

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, newStatus: string) => {
    e.preventDefault()
    
    if (!user || !canChangeStatus(user)) {
      alert('No tienes permisos para cambiar el estado de las tareas')
      setDraggedTask(null)
      return
    }
    
    if (draggedTask && draggedTask.status !== newStatus) {
      updateTaskStatus(draggedTask.id, newStatus)
    }
    setDraggedTask(null)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'border-l-red-500'
      case 'HIGH': return 'border-l-orange-500'
      case 'MEDIUM': return 'border-l-yellow-500'
      default: return 'border-l-green-500'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700'
      case 'HIGH': return 'bg-orange-100 text-orange-700'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-green-100 text-green-700'
    }
  }

  const getPriorityEmoji = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '🔴'
      case 'HIGH': return '🟠'
      case 'MEDIUM': return '🟡'
      default: return '🟢'
    }
  }

  const getColumnColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 border-gray-300'
      case 'IN_PROGRESS': return 'bg-blue-50 border-blue-300'
      case 'COMPLETED': return 'bg-green-50 border-green-300'
      case 'BLOCKED': return 'bg-red-50 border-red-300'
      default: return 'bg-gray-100 border-gray-300'
    }
  }

  const getColumnIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return '📋'
      case 'IN_PROGRESS': return '🚀'
      case 'COMPLETED': return '✅'
      case 'BLOCKED': return '⚠️'
      default: return '📋'
    }
  }

  const columns = [
    { status: 'PENDING', title: 'Pendientes' },
    { status: 'IN_PROGRESS', title: 'En Progreso' },
    { status: 'COMPLETED', title: 'Completadas' },
    { status: 'BLOCKED', title: 'Bloqueadas' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tablero Kanban...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              📊 Tablero Kanban
            </h1>
            <p className="text-gray-600">
              Arrastra y suelta las tareas para cambiar su estado
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => router.push('/calendario')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📅 Calendario
            </button>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="font-medium text-blue-900 mb-1">Cómo usar el tablero Kanban</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Arrastra una tarjeta de tarea hacia otra columna para cambiar su estado</li>
                <li>• Los colores de borde indican la prioridad: 🔴 Urgente, 🟠 Alta, 🟡 Media, 🟢 Baja</li>
                <li>• La barra de progreso muestra el avance de cada tarea</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => {
            const columnTasks = tasks.filter(task => task.status === column.status)
            const isDropping = draggedTask && draggedTask.status !== column.status

            return (
              <div
                key={column.status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.status)}
                className={`
                  rounded-lg border-2 transition-all
                  ${getColumnColor(column.status)}
                  ${isDropping ? 'ring-4 ring-blue-400 ring-opacity-50 scale-105' : ''}
                `}
              >
                {/* Column Header */}
                <div className="p-4 border-b border-gray-300 bg-white bg-opacity-50">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <span className="text-2xl">{getColumnIcon(column.status)}</span>
                      {column.title}
                    </h2>
                    <span className="bg-gray-800 text-white text-sm font-bold px-2.5 py-1 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column Tasks */}
                <div className="p-4 space-y-3 min-h-[500px]">
                  {columnTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="text-sm">No hay tareas</p>
                      {isDropping && (
                        <p className="text-xs mt-2 text-blue-600 font-medium">
                          ⬇️ Suelta aquí para mover
                        </p>
                      )}
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task)}
                        onDragEnd={handleDragEnd}
                        className={`
                          bg-white rounded-lg border-l-4 shadow-sm p-4 cursor-move
                          hover:shadow-lg transition-all
                          ${getPriorityColor(task.priority)}
                          ${draggedTask?.id === task.id ? 'opacity-50 scale-95' : ''}
                        `}
                      >
                        {/* Task Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 mr-2">
                            <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                              {task.title}
                            </p>
                            <p className="text-xs text-blue-600 font-medium mt-1">
                              {task.code}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getPriorityBadge(task.priority)}`}>
                            {getPriorityEmoji(task.priority)} {task.priority}
                          </span>
                        </div>

                        {/* Project */}
                        {task.project && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-600">
                              📁 {task.project.name}
                            </p>
                          </div>
                        )}

                        {/* Description */}
                        {task.description && (
                          <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                            <span>Progreso</span>
                            <span className="font-semibold">{task.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                task.progress === 100
                                  ? 'bg-green-500'
                                  : task.progress >= 50
                                  ? 'bg-blue-500'
                                  : 'bg-yellow-500'
                              }`}
                              style={{ width: `${task.progress}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <span>📅</span>
                            <span>{new Date(task.startDate).toLocaleDateString()}</span>
                          </div>
                          <span>→</span>
                          <div className="flex items-center gap-1">
                            <span>🏁</span>
                            <span>{new Date(task.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {/* Overdue indicator */}
                        {new Date(task.endDate) < new Date() && task.status !== 'COMPLETED' && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <p className="text-xs text-red-600 font-medium">
                              ⚠️ Tarea atrasada
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Total de Tareas</p>
              <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Completadas</p>
              <p className="text-2xl font-bold text-green-600">
                {tasks.filter(t => t.status === 'COMPLETED').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">En Progreso</p>
              <p className="text-2xl font-bold text-blue-600">
                {tasks.filter(t => t.status === 'IN_PROGRESS').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tasa de Completitud</p>
              <p className="text-2xl font-bold text-purple-600">
                {tasks.length > 0
                  ? Math.round((tasks.filter(t => t.status === 'COMPLETED').length / tasks.length) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
