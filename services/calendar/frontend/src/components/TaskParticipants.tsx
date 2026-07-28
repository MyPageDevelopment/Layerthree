'use client'

import { useState, useEffect } from 'react'
import { getToken } from '@/lib/auth'

interface User {
  id: string
  email: string
  name: string
  role: string
  department?: string
  position?: string
}

interface Participant {
  assignmentId: string
  role: string
  allocatedHours?: number
  user: User
  assignedAt: string
}

interface ParticipantsData {
  taskId: string
  taskCode: string
  taskTitle: string
  participants: Participant[]
  totalParticipants: number
}

interface TaskParticipantsProps {
  taskId: string
  onUpdate?: () => void
}

interface UserWithStats extends User {
  tasksCount?: number
  workload?: 'light' | 'medium' | 'heavy'
}

export default function TaskParticipants({ taskId, onUpdate }: TaskParticipantsProps) {
  const [participants, setParticipants] = useState<ParticipantsData | null>(null)
  const [allUsers, setAllUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')

  useEffect(() => {
    loadParticipants()
    loadAllUsers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  const loadParticipants = async () => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(`${apiUrl}/tasks/${taskId}/participants`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setParticipants(data)
      }
    } catch (error) {
      console.error('Error cargando participantes:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAllUsers = async () => {
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
        const users = await response.json()
        
        // Obtener estadísticas de tareas para cada usuario
        const usersWithStats = await Promise.all(
          users.map(async (user: User) => {
            try {
              const tasksResponse = await fetch(`${apiUrl}/tasks?assignedTo=${user.id}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              })
              
              if (tasksResponse.ok) {
                const tasks = await tasksResponse.json()
                const activeTasks = tasks.filter((t: any) => 
                  t.status === 'PENDING' || t.status === 'IN_PROGRESS'
                )
                const tasksCount = activeTasks.length
                
                // Determinar nivel de carga
                let workload: 'light' | 'medium' | 'heavy' = 'light'
                if (tasksCount >= 8) workload = 'heavy'
                else if (tasksCount >= 4) workload = 'medium'
                
                return { ...user, tasksCount, workload }
              }
            } catch (error) {
              console.error(`Error cargando tareas para ${user.name}:`, error)
            }
            
            return { ...user, tasksCount: 0, workload: 'light' as const }
          })
        )
        
        setAllUsers(usersWithStats)
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    }
  }

  const addParticipant = async () => {
    if (!selectedUserId) return

    setIsAdding(true)
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(`${apiUrl}/tasks/${taskId}/participants/${selectedUserId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        await loadParticipants()
        setShowAddModal(false)
        setSelectedUserId('')
        if (onUpdate) {
          onUpdate()
        }
      } else {
        const error = await response.json()
        alert(error.message || 'Error al agregar participante')
      }
    } catch (error) {
      console.error('Error agregando participante:', error)
      alert('Error al agregar participante')
    } finally {
      setIsAdding(false)
    }
  }

  const removeParticipant = async (userId: string, userName: string) => {
    if (!confirm(`¿Eliminar a ${userName} de esta tarea?`)) return

    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(`${apiUrl}/tasks/${taskId}/participants/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        await loadParticipants()
        if (onUpdate) {
          onUpdate()
        }
      } else {
        const error = await response.json()
        alert(error.message || 'Error al eliminar participante')
      }
    } catch (error) {
      console.error('Error eliminando participante:', error)
      alert('Error al eliminar participante')
    }
  }

  if (loading) {
    return <div className="text-gray-500">Cargando participantes...</div>
  }

  // Filtrar usuarios disponibles según búsqueda y filtros
  let availableUsers = allUsers.filter(
    user => !participants?.participants.some(p => p.user.id === user.id)
  )

  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    availableUsers = availableUsers.filter(user =>
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.position?.toLowerCase().includes(query)
    )
  }

  if (filterRole) {
    availableUsers = availableUsers.filter(user => user.role === filterRole)
  }

  if (filterDepartment) {
    availableUsers = availableUsers.filter(user => user.department === filterDepartment)
  }

  // Ordenar por carga de trabajo (menos cargados primero)
  availableUsers.sort((a, b) => {
    const workloadOrder = { light: 1, medium: 2, heavy: 3 }
    return workloadOrder[a.workload || 'light'] - workloadOrder[b.workload || 'light']
  })

  // Obtener valores únicos para filtros
  const uniqueRoles = Array.from(new Set(allUsers.map(u => u.role).filter(Boolean)))
  const uniqueDepartments = Array.from(new Set(allUsers.map(u => u.department).filter(Boolean)))

  const getWorkloadColor = (workload?: 'light' | 'medium' | 'heavy') => {
    switch (workload) {
      case 'heavy': return 'bg-red-100 text-red-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-green-100 text-green-700'
    }
  }

  const getWorkloadText = (workload?: 'light' | 'medium' | 'heavy') => {
    switch (workload) {
      case 'heavy': return 'Alta carga'
      case 'medium': return 'Carga media'
      default: return 'Disponible'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Participantes ({participants?.totalParticipants || 0})
        </h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          + Agregar Participante
        </button>
      </div>

      {/* Lista de participantes */}
      <div className="space-y-2">
        {participants?.participants.length === 0 ? (
          <p className="text-gray-500 text-sm">No hay participantes asignados</p>
        ) : (
          participants?.participants.map((participant) => (
            <div
              key={participant.assignmentId}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">
                      {participant.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{participant.user.name}</p>
                    <p className="text-sm text-gray-500">{participant.user.email}</p>
                  </div>
                </div>
                {participant.user.position && (
                  <p className="text-xs text-gray-500 mt-1 ml-13">
                    {participant.user.position}
                    {participant.user.department && ` - ${participant.user.department}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  {participant.role}
                </span>
                <button
                  onClick={() => removeParticipant(participant.user.id, participant.user.name)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal para agregar participante */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Agregar Participante
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Selecciona un usuario para asignar a esta tarea
              </p>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Búsqueda */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🔍 Buscar Usuario
                </label>
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o posición..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filtrar por Rol
                  </label>
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos los roles</option>
                    {uniqueRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filtrar por Departamento
                  </label>
                  <select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todos los departamentos</option>
                    {uniqueDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lista de usuarios disponibles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuarios Disponibles ({availableUsers.length})
                </label>
                
                {availableUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {searchQuery || filterRole || filterDepartment ? (
                      <div>
                        <p className="mb-2">No se encontraron usuarios con los filtros aplicados</p>
                        <button
                          onClick={() => {
                            setSearchQuery('')
                            setFilterRole('')
                            setFilterDepartment('')
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Limpiar filtros
                        </button>
                      </div>
                    ) : (
                      <p>Todos los usuarios ya están asignados a esta tarea</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                    {availableUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                        className={`
                          p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md
                          ${selectedUserId === user.id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-blue-300'
                          }
                        `}
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-md">
                            <span className="text-white font-bold text-lg">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>

                          {/* Info del usuario */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-gray-900 truncate">
                                {user.name}
                              </p>
                              {selectedUserId === user.id && (
                                <span className="text-blue-600">✓</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate">{user.email}</p>
                            {user.position && (
                              <p className="text-xs text-gray-500 mt-1">
                                {user.position}
                                {user.department && ` • ${user.department}`}
                              </p>
                            )}

                            {/* Indicadores */}
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {user.role}
                              </span>
                              
                              {/* Indicador de carga de trabajo */}
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getWorkloadColor(user.workload)}`}>
                                {user.workload === 'heavy' && '🔴'}
                                {user.workload === 'medium' && '🟡'}
                                {user.workload === 'light' && '🟢'}
                                {getWorkloadText(user.workload)}
                              </span>

                              {/* Número de tareas activas */}
                              {user.tasksCount !== undefined && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  📋 {user.tasksCount} tarea{user.tasksCount !== 1 ? 's' : ''} activa{user.tasksCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedUserId('')
                  setSearchQuery('')
                  setFilterRole('')
                  setFilterDepartment('')
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                disabled={isAdding}
              >
                Cancelar
              </button>
              <button
                onClick={addParticipant}
                disabled={!selectedUserId || isAdding}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {isAdding ? 'Agregando...' : 'Agregar Participante'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
