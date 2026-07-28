'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { requireAuth, requireModuleAccess, getToken, getUser, getUserData } from '@/lib/auth'
import { canCreateEdit, canDelete, canChangeStatus } from '@/lib/permissions'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import FormInput from '@/components/ui/FormInput'
import Select from '@/components/ui/Select'
import TextArea from '@/components/ui/TextArea'

interface Project {
  id: string
  code: string
  name: string
  description?: string
  status: string
  priority: string
  startDate?: string
  endDate?: string
  budget?: number
  estimatedHours?: number
  owner?: {
    id: string
    name: string
    email: string
  }
  manager?: {
    id: string
    name: string
    email: string
  }
  _count?: {
    tasks: number
    milestones: number
  }
}

interface FormData {
  code: string
  name: string
  description: string
  status: string
  priority: string
  startDate: string
  endDate: string
  budget: string
  estimatedHours: string
  ownerId: string
}

export default function ProyectosPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [formData, setFormData] = useState<FormData>({
    code: '',
    name: '',
    description: '',
    status: 'PLANNING',
    priority: 'MEDIUM',
    startDate: '',
    endDate: '',
    budget: '',
    estimatedHours: '',
    ownerId: ''
  })

  useEffect(() => {
    requireAuth()
    requireModuleAccess('projects')
    const userData = getUserData()
    if (userData) {
      setUser(userData)
      setCurrentUserId(String(userData.id))
      setFormData(prev => ({ ...prev, ownerId: String(userData.id) }))
    }
    loadProjects()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (project?: Project) => {
    if (project) {
      setEditingProject(project)
      setFormData({
        code: project.code,
        name: project.name,
        description: project.description || '',
        status: project.status,
        priority: project.priority,
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
        budget: project.budget?.toString() || '',
        estimatedHours: project.estimatedHours?.toString() || '',
        ownerId: project.owner?.id || currentUserId
      })
    } else {
      setEditingProject(null)
      setFormData({
        code: '',
        name: '',
        description: '',
        status: 'PLANNING',
        priority: 'MEDIUM',
        startDate: '',
        endDate: '',
        budget: '',
        estimatedHours: '',
        ownerId: currentUserId
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingProject(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'
      
      const payload = {
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
        status: formData.status,
        priority: formData.priority,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
        ownerId: formData.ownerId
      }

      const url = editingProject 
        ? `${apiUrl}/projects/${editingProject.id}`
        : `${apiUrl}/projects`
      
      const method = editingProject ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        await loadProjects()
        handleCloseModal()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'No se pudo guardar el proyecto'}`)
      }
    } catch (error) {
      console.error('Error saving project:', error)
      alert('Error al guardar el proyecto')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (projectId: string) => {
    if (!confirm('¿Estás seguro de eliminar este proyecto? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'
      
      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        await loadProjects()
      } else {
        alert('Error al eliminar el proyecto')
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('Error al eliminar el proyecto')
    }
  }
  const handleExportProject = async (projectId: string) => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'
      
      const response = await fetch(`${apiUrl}/reports/projects/${projectId}/export`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        // Obtener el nombre del archivo del header o usar uno por defecto
        const contentDisposition = response.headers.get('Content-Disposition')
        let filename = `Proyecto_${projectId}_${new Date().toISOString().split('T')[0]}.xlsx`
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
          if (filenameMatch) {
            filename = filenameMatch[1]
          }
        }

        // Descargar el archivo
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const error = await response.json()
        alert(`Error al exportar: ${error.message || 'No se pudo generar el reporte'}`)
      }
    } catch (error) {
      console.error('Error exporting project:', error)
      alert('Error al exportar el proyecto')
    }
  }
  const handleCompleteProject = async (projectId: string, currentStatus: string) => {
    if (currentStatus === 'COMPLETED') {
      alert('Este proyecto ya está completado')
      return
    }

    if (!confirm('¿Deseas marcar este proyecto como completado?')) {
      return
    }

    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'
      
      const response = await fetch(`${apiUrl}/projects/${projectId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      })

      if (response.ok) {
        await loadProjects()
      } else {
        const error = await response.json()
        alert(`Error: ${error.message || 'No se pudo completar el proyecto'}`)
      }
    } catch (error) {
      console.error('Error completing project:', error)
      alert('Error al completar el proyecto')
    }
  }

  const getStatusBadge = (status: string) => {
    const classes = {
      'PLANNING': 'bg-yellow-100 text-yellow-800',
      'ACTIVE': 'bg-green-100 text-green-800',
      'ON_HOLD': 'bg-gray-100 text-gray-800',
      'COMPLETED': 'bg-blue-100 text-blue-800',
      'CANCELLED': 'bg-red-100 text-red-800'
    }
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityBadge = (priority: string) => {
    const classes = {
      'LOW': 'bg-gray-100 text-gray-600',
      'MEDIUM': 'bg-blue-100 text-blue-700',
      'HIGH': 'bg-orange-100 text-orange-700',
      'CRITICAL': 'bg-red-100 text-red-700'
    }
    return classes[priority as keyof typeof classes] || 'bg-gray-100 text-gray-600'
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">Proyectos</h2>
          <p className="text-gray-600 mt-2">Gestión y seguimiento de proyectos</p>
        </div>
        {user && canCreateEdit(user) && (
          <Button onClick={() => handleOpenModal()}>
            <svg className="w-5 h-5 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Proyecto
          </Button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-4 text-gray-500">No hay proyectos disponibles</p>
            <Button onClick={() => handleOpenModal()} className="mt-4" size="sm">
              Crear Primer Proyecto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 cursor-pointer" onClick={() => router.push(`/proyectos/${project.id}`)}>
                    <h3 className="text-lg font-bold text-gray-800 hover:text-blue-600">{project.name}</h3>
                    <p className="text-sm text-gray-500">{project.code}</p>
                  </div>
                  <div className="flex gap-2">
                    {/* Botón de ver archivos */}
                    <button
                      onClick={() => router.push(`/proyectos/${project.id}`)}
                      className="text-purple-600 hover:text-purple-800 transition-colors"
                      title="Ver archivos"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </button>
                    {/* Botón de exportar a Excel */}
                    <button
                      onClick={() => handleExportProject(project.id)}
                      className="text-green-600 hover:text-green-800 transition-colors"
                      title="Exportar a Excel"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    {user && canCreateEdit(user) && (
                      <button
                        onClick={() => handleOpenModal(project)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Editar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {user && canDelete(user) && (
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                    {user && canChangeStatus(user) && project.status !== 'COMPLETED' && (
                      <button
                        onClick={() => handleCompleteProject(project.id, project.status)}
                        className="text-green-600 hover:text-green-800 transition-colors"
                        title="Completar Proyecto"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 mb-3">
                  <span className={`px-2 py-1 text-xs rounded-full font-semibold ${getStatusBadge(project.status)}`}>
                    {project.status}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full font-semibold ${getPriorityBadge(project.priority)}`}>
                    {project.priority}
                  </span>
                </div>

                {project.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                )}
                
                <div className="space-y-2 text-xs text-gray-500">
                  {project.owner && (
                    <p><span className="font-medium">Owner:</span> {project.owner.name}</p>
                  )}
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Inicio: {new Date(project.startDate!).toLocaleDateString()}
                  </div>
                  {project.endDate && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Fin: {new Date(project.endDate).toLocaleDateString()}
                    </div>
                  )}
                  {project._count && (
                    <div className="flex gap-4 pt-2 border-t">
                      <span><span className="font-medium">{project._count.tasks}</span> tareas</span>
                      <span><span className="font-medium">{project._count.milestones}</span> hitos</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        title={editingProject ? 'Editar Proyecto' : 'Nuevo Proyecto'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Código"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="PRJ-2025-001"
              required
              disabled={!!editingProject}
            />
            <FormInput
              label="Nombre"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del proyecto"
              required
            />
          </div>

          <TextArea
            label="Descripción"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Descripción del proyecto..."
            rows={3}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Estado"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'PLANNING', label: 'Planificación' },
                { value: 'ACTIVE', label: 'Activo' },
                { value: 'ON_HOLD', label: 'En Espera' },
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

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Presupuesto"
              type="number"
              step="0.01"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="0.00"
            />
            <FormInput
              label="Horas Estimadas"
              type="number"
              step="0.5"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
              placeholder="0"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {editingProject ? 'Guardar Cambios' : 'Crear Proyecto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

