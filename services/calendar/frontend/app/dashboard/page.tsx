'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken, getUser } from '@/lib/auth'

interface User {
  id: string
  name: string
  email: string
  role: string
  department?: string
  position?: string
}

interface Task {
  id: string
  code: string
  title: string
  status: string
  priority: string
  startDate: string
  endDate: string
  progress: number
  projectId: string
}

interface UserStats {
  user: User
  tasksTotal: number
  tasksPending: number
  tasksInProgress: number
  tasksCompleted: number
  tasksBlocked: number
  tasksOverdue: number
  workload: 'light' | 'medium' | 'heavy'
}

interface ProjectStats {
  id: string
  code: string
  name: string
  tasksTotal: number
  tasksCompleted: number
  progress: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState<UserStats[]>([])
  const [projectStats, setProjectStats] = useState<ProjectStats[]>([])
  const [overallStats, setOverallStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    blockedTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
  })

  useEffect(() => {
    const userInfo = getUser()
    if (!userInfo) {
      router.push('/login')
      return
    }

    loadDashboardData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadUserStats(),
        loadProjectStats(),
        loadOverallStats(),
      ])
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserStats = async () => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      // Obtener todos los usuarios
      const usersResponse = await fetch(`${apiUrl}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!usersResponse.ok) return

      const users: User[] = await usersResponse.json()

      // Obtener estadísticas para cada usuario
      const stats = await Promise.all(
        users.map(async (user) => {
          try {
            const tasksResponse = await fetch(`${apiUrl}/tasks?assignedTo=${user.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })

            if (!tasksResponse.ok) {
              return {
                user,
                tasksTotal: 0,
                tasksPending: 0,
                tasksInProgress: 0,
                tasksCompleted: 0,
                tasksBlocked: 0,
                tasksOverdue: 0,
                workload: 'light' as const,
              }
            }

            const tasks: Task[] = await tasksResponse.json()
            const now = new Date()

            const tasksPending = tasks.filter(t => t.status === 'PENDING').length
            const tasksInProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length
            const tasksCompleted = tasks.filter(t => t.status === 'COMPLETED').length
            const tasksBlocked = tasks.filter(t => t.status === 'BLOCKED').length
            const tasksOverdue = tasks.filter(t => 
              new Date(t.endDate) < now && 
              (t.status === 'PENDING' || t.status === 'IN_PROGRESS')
            ).length

            const activeTasks = tasksPending + tasksInProgress
            let workload: 'light' | 'medium' | 'heavy' = 'light'
            if (activeTasks >= 8) workload = 'heavy'
            else if (activeTasks >= 4) workload = 'medium'

            return {
              user,
              tasksTotal: tasks.length,
              tasksPending,
              tasksInProgress,
              tasksCompleted,
              tasksBlocked,
              tasksOverdue,
              workload,
            }
          } catch (error) {
            console.error(`Error cargando tareas para ${user.name}:`, error)
            return {
              user,
              tasksTotal: 0,
              tasksPending: 0,
              tasksInProgress: 0,
              tasksCompleted: 0,
              tasksBlocked: 0,
              tasksOverdue: 0,
              workload: 'light' as const,
            }
          }
        })
      )

      // Ordenar por carga de trabajo
      stats.sort((a, b) => {
        const workloadOrder = { heavy: 3, medium: 2, light: 1 }
        return workloadOrder[b.workload] - workloadOrder[a.workload]
      })

      setUserStats(stats)
    } catch (error) {
      console.error('Error cargando estadísticas de usuarios:', error)
    }
  }

  const loadProjectStats = async () => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const projectsResponse = await fetch(`${apiUrl}/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!projectsResponse.ok) return

      const projects = await projectsResponse.json()

      const stats = await Promise.all(
        projects.map(async (project: any) => {
          try {
            const tasksResponse = await fetch(`${apiUrl}/tasks?projectId=${project.id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            })

            if (!tasksResponse.ok) {
              return {
                id: project.id,
                code: project.code,
                name: project.name,
                tasksTotal: 0,
                tasksCompleted: 0,
                progress: 0,
              }
            }

            const tasks: Task[] = await tasksResponse.json()
            const tasksCompleted = tasks.filter(t => t.status === 'COMPLETED').length
            const progress = tasks.length > 0 ? Math.round((tasksCompleted / tasks.length) * 100) : 0

            return {
              id: project.id,
              code: project.code,
              name: project.name,
              tasksTotal: tasks.length,
              tasksCompleted,
              progress,
            }
          } catch (error) {
            return {
              id: project.id,
              code: project.code,
              name: project.name,
              tasksTotal: 0,
              tasksCompleted: 0,
              progress: 0,
            }
          }
        })
      )

      // Ordenar por progreso (menor a mayor)
      stats.sort((a, b) => a.progress - b.progress)

      setProjectStats(stats)
    } catch (error) {
      console.error('Error cargando estadísticas de proyectos:', error)
    }
  }

  const loadOverallStats = async () => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const tasksResponse = await fetch(`${apiUrl}/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!tasksResponse.ok) return

      const tasks: Task[] = await tasksResponse.json()
      const now = new Date()

      const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length
      const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length
      const blockedTasks = tasks.filter(t => t.status === 'BLOCKED').length
      const overdueTasks = tasks.filter(t =>
        new Date(t.endDate) < now &&
        (t.status === 'PENDING' || t.status === 'IN_PROGRESS')
      ).length

      const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0

      setOverallStats({
        totalTasks: tasks.length,
        completedTasks,
        inProgressTasks,
        blockedTasks,
        overdueTasks,
        completionRate,
      })
    } catch (error) {
      console.error('Error cargando estadísticas generales:', error)
    }
  }

  const getWorkloadColor = (workload: 'light' | 'medium' | 'heavy') => {
    switch (workload) {
      case 'heavy': return 'bg-red-100 text-red-700 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default: return 'bg-green-100 text-green-700 border-green-200'
    }
  }

  const getWorkloadIcon = (workload: 'light' | 'medium' | 'heavy') => {
    switch (workload) {
      case 'heavy': return '🔴'
      case 'medium': return '🟡'
      default: return '🟢'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📊 Dashboard de Gestión de Proyectos
          </h1>
          <p className="text-gray-600">
            Vista general del equipo, proyectos y tareas
          </p>
        </div>

        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="text-sm font-medium text-gray-600 mb-1">Total de Tareas</div>
            <div className="text-3xl font-bold text-gray-900">{overallStats.totalTasks}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="text-sm font-medium text-gray-600 mb-1">Completadas</div>
            <div className="text-3xl font-bold text-green-600">{overallStats.completedTasks}</div>
            <div className="text-xs text-gray-500 mt-1">{overallStats.completionRate}% del total</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="text-sm font-medium text-gray-600 mb-1">En Progreso</div>
            <div className="text-3xl font-bold text-yellow-600">{overallStats.inProgressTasks}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
            <div className="text-sm font-medium text-gray-600 mb-1">Bloqueadas</div>
            <div className="text-3xl font-bold text-red-600">{overallStats.blockedTasks}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="text-sm font-medium text-gray-600 mb-1">Atrasadas</div>
            <div className="text-3xl font-bold text-purple-600">{overallStats.overdueTasks}</div>
          </div>
        </div>

        {/* Grid de dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Estadísticas por Usuario */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                👥 Carga de Trabajo por Usuario
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Estado de tareas asignadas a cada miembro del equipo
              </p>
            </div>
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {userStats.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay usuarios registrados</p>
              ) : (
                <div className="space-y-4">
                  {userStats.map((stat) => (
                    <div
                      key={stat.user.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                            <span className="text-white font-bold">
                              {stat.user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{stat.user.name}</p>
                            <p className="text-xs text-gray-500">{stat.user.position || stat.user.role}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getWorkloadColor(stat.workload)}`}>
                          {getWorkloadIcon(stat.workload)} {stat.workload === 'heavy' ? 'Alta' : stat.workload === 'medium' ? 'Media' : 'Baja'}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-2 text-center">
                        <div>
                          <div className="text-xs text-gray-500">Total</div>
                          <div className="text-lg font-semibold text-gray-900">{stat.tasksTotal}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Pend.</div>
                          <div className="text-lg font-semibold text-gray-600">{stat.tasksPending}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Prog.</div>
                          <div className="text-lg font-semibold text-yellow-600">{stat.tasksInProgress}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Comp.</div>
                          <div className="text-lg font-semibold text-green-600">{stat.tasksCompleted}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Bloq.</div>
                          <div className="text-lg font-semibold text-red-600">{stat.tasksBlocked}</div>
                        </div>
                      </div>

                      {stat.tasksOverdue > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center gap-2 text-purple-600">
                            <span className="text-sm">⚠️</span>
                            <span className="text-sm font-medium">
                              {stat.tasksOverdue} tarea{stat.tasksOverdue !== 1 ? 's' : ''} atrasada{stat.tasksOverdue !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Estadísticas por Proyecto */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                📁 Progreso por Proyecto
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Estado de avance de cada proyecto activo
              </p>
            </div>
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {projectStats.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No hay proyectos registrados</p>
              ) : (
                <div className="space-y-4">
                  {projectStats.map((project) => (
                    <div
                      key={project.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-900">{project.name}</h3>
                          <span className="text-sm font-medium text-blue-600">{project.code}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>{project.tasksCompleted} de {project.tasksTotal} tareas completadas</span>
                          <span className="font-semibold">{project.progress}%</span>
                        </div>
                      </div>

                      {/* Barra de progreso */}
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            project.progress === 100
                              ? 'bg-green-500'
                              : project.progress >= 75
                              ? 'bg-blue-500'
                              : project.progress >= 50
                              ? 'bg-yellow-500'
                              : project.progress >= 25
                              ? 'bg-orange-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botones de navegación */}
        <div className="mt-8 flex gap-4 justify-center">
          <button
            onClick={() => router.push('/calendario')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            📅 Ir al Calendario
          </button>
          <button
            onClick={() => router.push('/projects')}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            📁 Ver Proyectos
          </button>
        </div>
      </div>
    </div>
  )
}
