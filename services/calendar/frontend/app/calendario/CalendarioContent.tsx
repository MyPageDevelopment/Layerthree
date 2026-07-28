'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { requireAuth, requireModuleAccess, getToken, getUserData } from '@/lib/auth'
import { canCreateEdit, canDelete, canChangeStatus } from '@/lib/permissions'
import Calendar from '@/components/Calendar'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import FormInput from '@/components/ui/FormInput'
import Select from '@/components/ui/Select'
import TextArea from '@/components/ui/TextArea'
import TaskParticipants from '@/components/TaskParticipants'
import ShiftTypeSelector from '@/components/ShiftTypeSelector'
import DayDetailView from '@/components/DayDetailView'
import Link from 'next/link'
import { ShiftType } from '@/types'

interface CalendarTask {
  id: string
  code?: string
  title: string
  description?: string
  status: string
  priority: string
  startDate?: string
  endDate?: string
  estimatedHours?: number
  progress?: number
  actualHours?: number
  project?: {
    id: string
    code: string
    name: string
  }
}

interface Project {
  id: string
  code: string
  name: string
}

interface TaskFormData {
  code: string
  title: string
  description: string
  projectId: string
  status: string
  priority: string
  startDate: string
  endDate: string
  estimatedHours: string
  shiftTypeId: string
  participantIds: string[]
  sendEmail: boolean
}

export default function CalendarioContent() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<CalendarTask[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDayDetail, setShowDayDetail] = useState(false)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const [formData, setFormData] = useState<TaskFormData>({
    code: '',
    title: '',
    description: '',
    projectId: '',
    status: 'PENDING',
    priority: 'MEDIUM',
    startDate: '',
    endDate: '',
    estimatedHours: '',
    shiftTypeId: '',
    participantIds: [],
    sendEmail: false
  })

  useEffect(() => {
    requireAuth()
    requireModuleAccess('projects')
    const userData = getUserData()
    if (userData) setUser(userData)
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Abrir tarea específica si viene en URL
  useEffect(() => {
    const taskId = searchParams.get('taskId')
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        handleTaskClick(task)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, tasks])

  const loadData = async () => {
    await Promise.all([loadTasks(), loadProjects(), loadUsers(), loadShiftTypes()])
    setLoading(false)
  }

  const loadTasks = async () => {
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
    }
  }

  const loadProjects = async () => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(`${apiUrl}/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Error cargando proyectos:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(`${apiUrl}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setAllUsers(data)
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    }
  }

  const loadShiftTypes = async () => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(`${apiUrl}/shift-types`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setShiftTypes(data)
      }
    } catch (error) {
      console.error('Error cargando tipos de jornada:', error)
    }
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setShowDayDetail(true)
  }

  const handleCreateTaskFromDay = () => {
    if (!selectedDate) return
    setShowDayDetail(false)
    setSelectedTask(null)
    setFormData({
      code: '',
      title: '',
      description: '',
      projectId: '',
      status: 'PENDING',
      priority: 'MEDIUM',
      startDate: selectedDate.toISOString().split('T')[0],
      endDate: selectedDate.toISOString().split('T')[0],
      estimatedHours: '',
      shiftTypeId: '',
      participantIds: [],
      sendEmail: false
    })
    setIsModalOpen(true)
  }

  const handleCreateTaskFromButton = () => {
    const today = new Date()
    setSelectedDate(today)
    setSelectedTask(null)
    setFormData({
      code: '',
      title: '',
      description: '',
      projectId: '',
      status: 'PENDING',
      priority: 'MEDIUM',
      startDate: today.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      estimatedHours: '',
      shiftTypeId: '',
      participantIds: [],
      sendEmail: false
    })
    setIsModalOpen(true)
  }

  const handleTaskClick = (task: CalendarTask) => {
    setShowDayDetail(false)
    setSelectedTask(task)
    setSelectedDate(null)
    setFormData({
      code: task.code || '',
      title: task.title,
      description: task.description || '',
      projectId: task.project?.id || '',
      status: task.status,
      priority: task.priority,
      startDate: task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '',
      endDate: task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '',
      estimatedHours: task.estimatedHours?.toString() || '',
      shiftTypeId: '',
      participantIds: [],
      sendEmail: false
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedTask(null)
    setSelectedDate(null)
    // Recargar tareas al cerrar el modal para reflejar cualquier cambio en participantes
    loadTasks()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'
      
      const payload = {
        code: formData.code,
        title: formData.title,
        description: formData.description || undefined,
        projectId: formData.projectId,
        status: formData.status,
        priority: formData.priority,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
        shiftTypeId: formData.shiftTypeId && formData.shiftTypeId.trim() !== '' ? formData.shiftTypeId : undefined,
        participantIds: formData.participantIds.length > 0 ? formData.participantIds : undefined,
        sendEmail: formData.participantIds.length > 0 ? formData.sendEmail : undefined
      }

      const url = selectedTask 
        ? `${apiUrl}/tasks/${selectedTask.id}`
        : `${apiUrl}/tasks`
      
      const method = selectedTask ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        await loadTasks()
        handleCloseModal()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'No se pudo guardar la tarea'}`)
      }
    } catch (error) {
      console.error('Error saving task:', error)
      alert('Error al guardar la tarea')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedTask) return
    
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) {
      return
    }

    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'
      
      const response = await fetch(`${apiUrl}/tasks/${selectedTask.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await loadTasks()
        handleCloseModal()
      } else {
        alert('Error al eliminar la tarea')
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Error al eliminar la tarea')
    }
  }

  const handleCompleteTask = async (taskId: string, currentStatus: string) => {
    if (currentStatus === 'COMPLETED') {
      alert('Esta tarea ya está completada')
      return
    }

    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'
      
      const response = await fetch(`${apiUrl}/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      })

      if (response.ok) {
        await loadTasks()
        if (selectedTask?.id === taskId) {
          handleCloseModal()
        }
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'No se pudo completar la tarea'}`)
      }
    } catch (error) {
      console.error('Error completing task:', error)
      alert('Error al completar la tarea')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Calendario de Tareas</h2>
        <p className="text-gray-600 mt-2">Gestión y seguimiento de tareas en calendario</p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* View Mode Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Día
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mes
            </button>
          </div>

          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold">{tasks.length}</span> tareas
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/mis-tareas"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Mis Tareas
          </Link>

          {user && canCreateEdit(user) && (
            <Button onClick={handleCreateTaskFromButton}>
              <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva Tarea
            </Button>
          )}
        </div>
      </div>

      <Calendar
        tasks={tasks}
        onDayClick={handleDayClick}
        onTaskClick={handleTaskClick}
        viewMode={viewMode}
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        title={selectedTask ? 'Editar Tarea' : 'Nueva Tarea'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Código"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="TASK-2025-001"
              required
              disabled={!!selectedTask}
            />
            <Select
              label="Proyecto"
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              options={[
                { value: '', label: 'Seleccionar proyecto...' },
                ...projects.map(p => ({ value: p.id, label: `${p.code} - ${p.name}` }))
              ]}
              required
            />
          </div>

          <FormInput
            label="Título"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Título de la tarea"
            required
          />

          <TextArea
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descripción de la tarea..."
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Estado"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'PENDING', label: 'Pendiente' },
                { value: 'IN_PROGRESS', label: 'En Progreso' },
                { value: 'BLOCKED', label: 'Bloqueado' },
                { value: 'COMPLETED', label: 'Completado' },
                { value: 'CANCELLED', label: 'Cancelado' }
              ]}
              required
            />
            <Select
              label="Prioridad"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              options={[
                { value: 'LOW', label: 'Baja' },
                { value: 'MEDIUM', label: 'Media' },
                { value: 'HIGH', label: 'Alta' },
                { value: 'CRITICAL', label: 'Crítica' }
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Fecha de Inicio"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <FormInput
              label="Fecha de Fin"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <FormInput
            label="Horas Estimadas"
            type="number"
            step="0.5"
            value={formData.estimatedHours}
            onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
            placeholder="0"
          />

          {/* Selector de Tipo de Jornada */}
          <ShiftTypeSelector
            value={formData.shiftTypeId}
            onChange={(value) => setFormData({ ...formData, shiftTypeId: value })}
            shiftTypes={shiftTypes}
            label="Tipo de Jornada"
          />

          {/* Selección de participantes (solo al crear) */}
          {!selectedTask && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asignar Participantes
                </label>
                <div className="border rounded-lg p-4 bg-gray-50 space-y-2">
                  {allUsers.map(user => (
                    <label key={user.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.participantIds.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              participantIds: [...formData.participantIds, user.id]
                            })
                          } else {
                            setFormData({
                              ...formData,
                              participantIds: formData.participantIds.filter(id => id !== user.id)
                            })
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {user.role}
                      </span>
                    </label>
                  ))}
                  {allUsers.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No hay usuarios disponibles
                    </p>
                  )}
                </div>
                {formData.participantIds.length > 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    {formData.participantIds.length} participante(s) seleccionado(s)
                  </p>
                )}
              </div>

              {/* Checkbox para envío de correo */}
              {formData.participantIds.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sendEmail}
                      onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        📧 Enviar correo de asignación
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Los participantes recibirán un correo con los detalles completos de la tarea asignada
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </>
          )}

          {/* Gestión de participantes (solo al editar) */}
          {selectedTask && (
            <div className="border-t pt-4">
              <TaskParticipants 
                taskId={selectedTask.id}
                onUpdate={() => loadTasks()}
              />
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <div className="flex gap-3">
              {selectedTask && user && canDelete(user) && (
                <Button type="button" variant="danger" onClick={handleDelete}>
                  Eliminar
                </Button>
              )}
              {selectedTask && user && canChangeStatus(user) && selectedTask.status !== 'COMPLETED' && (
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={() => handleCompleteTask(selectedTask.id, selectedTask.status)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  ✓ Completar Tarea
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>
                Cancelar
              </Button>
              {user && canCreateEdit(user) && (
                <Button type="submit" isLoading={isSubmitting}>
                  {selectedTask ? 'Guardar Cambios' : 'Crear Tarea'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Day Detail View */}
      {showDayDetail && selectedDate && (
        <DayDetailView
          date={selectedDate}
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onCreateTask={handleCreateTaskFromDay}
          onClose={() => {
            setShowDayDetail(false)
            setSelectedDate(null)
          }}
        />
      )}

      {/* Info Banner */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h4 className="font-medium text-blue-900 mb-1">Cómo usar el calendario</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Haz clic en cualquier día para ver todas las tareas programadas</li>
              <li>• Usa el selector de vista para cambiar entre Día, Semana y Mes</li>
              <li>• Haz clic en una tarea para editarla o ver más detalles</li>
              <li>• Usa el botón &ldquo;Nueva Tarea&rdquo; para crear una tarea rápidamente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
