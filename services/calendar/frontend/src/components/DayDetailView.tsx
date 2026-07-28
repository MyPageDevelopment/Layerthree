'use client'

import { useState } from 'react'

interface Task {
  id: string
  code?: string
  title: string
  description?: string
  status: string
  priority: string
  startDate?: string
  endDate?: string
  estimatedHours?: number
  actualHours?: number
  progress?: number
  project?: {
    id: string
    name: string
    code: string
  }
}

interface DayDetailViewProps {
  date: Date
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onCreateTask: () => void
  onClose: () => void
}

export default function DayDetailView({ date, tasks, onTaskClick, onCreateTask, onClose }: DayDetailViewProps) {
  const dayTasks = tasks.filter(task => {
    if (!task.startDate) return false
    const taskDate = new Date(task.startDate)
    return taskDate.toDateString() === date.toDateString()
  })

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-300',
    COMPLETED: 'bg-green-100 text-green-800 border-green-300',
    CANCELLED: 'bg-red-100 text-red-800 border-red-300',
    ON_HOLD: 'bg-gray-100 text-gray-800 border-gray-300'
  }

  const priorityColors = {
    LOW: 'bg-green-50 border-l-4 border-green-500',
    MEDIUM: 'bg-yellow-50 border-l-4 border-yellow-500',
    HIGH: 'bg-orange-50 border-l-4 border-orange-500',
    CRITICAL: 'bg-red-50 border-l-4 border-red-500'
  }

  const statusLabels = {
    PENDING: 'Pendiente',
    IN_PROGRESS: 'En Progreso',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    ON_HOLD: 'En Espera'
  }

  const priorityIcons = {
    LOW: '🟢',
    MEDIUM: '🟡',
    HIGH: '🟠',
    CRITICAL: '🔴'
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusStats = () => {
    const stats = {
      total: dayTasks.length,
      pending: dayTasks.filter(t => t.status === 'PENDING').length,
      inProgress: dayTasks.filter(t => t.status === 'IN_PROGRESS').length,
      completed: dayTasks.filter(t => t.status === 'COMPLETED').length
    }
    return stats
  }

  const stats = getStatusStats()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-8 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold capitalize">{formatDate(date)}</h2>
              <p className="text-blue-100 mt-1">{dayTasks.length} tarea{dayTasks.length !== 1 ? 's' : ''} programada{dayTasks.length !== 1 ? 's' : ''}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-blue-100">Total</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-2xl font-bold">{stats.pending}</div>
              <div className="text-sm text-blue-100">Pendientes</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <div className="text-sm text-blue-100">En Progreso</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-2xl font-bold">{stats.completed}</div>
              <div className="text-sm text-blue-100">Completadas</div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="p-6 overflow-y-auto" style={{maxHeight: 'calc(100vh - 350px)'}}>
          {dayTasks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay tareas programadas</h3>
              <p className="text-gray-500 mb-6">Crea una nueva tarea para este día</p>
              <button
                onClick={onCreateTask}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Tarea
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {dayTasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className={`${priorityColors[task.priority as keyof typeof priorityColors] || 'bg-gray-50 border-l-4 border-gray-500'} rounded-lg p-4 cursor-pointer hover:shadow-md transition-all`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{priorityIcons[task.priority as keyof typeof priorityIcons] || '⚪'}</span>
                        <h3 className="font-semibold text-gray-900">{task.title}</h3>
                        {task.code && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                            {task.code}
                          </span>
                        )}
                      </div>
                      {task.project && (
                        <div className="text-sm text-gray-600 mb-2">
                          📁 {task.project.code} - {task.project.name}
                        </div>
                      )}
                      {task.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColors[task.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800 border-gray-300'}`}>
                      {statusLabels[task.status as keyof typeof statusLabels] || task.status}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {task.progress !== undefined && task.progress > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Progreso</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Hours */}
                  {(task.estimatedHours || task.actualHours) && (
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      {task.estimatedHours && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Est: {task.estimatedHours}h</span>
                        </div>
                      )}
                      {task.actualHours && task.actualHours > 0 && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Real: {task.actualHours}h</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {dayTasks.length > 0 && (
          <div className="border-t bg-gray-50 px-6 py-4 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Haz clic en una tarea para ver detalles o editarla
            </div>
            <button
              onClick={onCreateTask}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Tarea
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
