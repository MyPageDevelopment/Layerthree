'use client'

import { useEffect, useState } from 'react'
import { requireAuth, requireModuleAccess, getUser, getToken } from '@/lib/auth'
import type { User, Project, TimeEntry } from '@/types'

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [recentEntries, setRecentEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    requireAuth()
    requireModuleAccess('projects')
    setUser(getUser())
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      // Cargar proyectos activos
      const projectsRes = await fetch(`${apiUrl}/projects?status=ACTIVE`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json()
        setProjects(projectsData)
      }

      // TODO: Cargar entradas recientes cuando se implemente el endpoint
      // const entriesRes = await fetch(`${apiUrl}/time-entries?limit=5`, {
      //   headers: {
      //     'Authorization': `Bearer ${token}`,
      //     'Content-Type': 'application/json',
      //   },
      // })
      // 
      // if (entriesRes.ok) {
      //   const entriesData = await entriesRes.json()
      //   setRecentEntries(entriesData)
      // }
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error)
    } finally {
      setLoading(false)
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
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Dashboard de Proyectos</h2>
        <p className="text-gray-600 mt-2">Gestión de tiempos y calendario</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Proyectos Activos</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{projects.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Horas Registradas</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {recentEntries.reduce((acc, entry) => acc + (entry.duration ? entry.duration / 3600 : 0), 0).toFixed(1)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">Entradas Recientes</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{recentEntries.length}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Proyectos Activos */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Proyectos Activos</h3>
        {projects.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay proyectos activos</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => (
              <div key={project.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <h4 className="font-semibold text-gray-800">{project.name}</h4>
                {project.description && (
                  <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                )}
                {project.startDate && (
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(project.startDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entradas Recientes */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Entradas de Tiempo Recientes</h3>
        {recentEntries.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay entradas registradas</p>
        ) : (
          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <p className="font-medium text-gray-800">{entry.task?.title || 'Tarea'}</p>
                  {entry.description && (
                    <p className="text-sm text-gray-600">{entry.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(entry.startTime).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">
                    {entry.duration ? `${(entry.duration / 60).toFixed(1)}h` : '-'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
