'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { requireAuth, requireModuleAccess, getToken } from '@/lib/auth'
import Button from '@/components/ui/Button'

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
}

interface FileInfo {
  filename: string
  size: number
  uploadDate: string
}

interface FolderStructure {
  folderName: string
  fileCount: number
  files: FileInfo[]
}

const FOLDERS = [
  { name: 'Imagenes', label: 'Imágenes', icon: '🖼️' },
  { name: 'AS-BUILT', label: 'AS-BUILT', icon: '📐' },
  { name: 'Contrato', label: 'Contrato', icon: '📄' },
  { name: 'Costos', label: 'Costos', icon: '💰' },
  { name: 'Firmados', label: 'Firmados', icon: '✍️' },
  { name: 'Anexos', label: 'Anexos', icon: '📎' },
  { name: 'Otros', label: 'Otros', icon: '📁' },
]

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [structure, setStructure] = useState<FolderStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: FileList | null }>({})

  useEffect(() => {
    requireAuth()
    requireModuleAccess('projects')
    loadProject()
    loadStructure()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProject = async () => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(`${apiUrl}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProject(data)
      }
    } catch (error) {
      console.error('Error loading project:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStructure = async () => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(`${apiUrl}/project-files/${projectId}/files/structure`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStructure(data.folders || [])
      }
    } catch (error) {
      console.error('Error loading structure:', error)
    }
  }

  const handleFileSelect = (folder: string, files: FileList | null) => {
    setSelectedFiles(prev => ({ ...prev, [folder]: files }))
  }

  const handleUpload = async (folderName: string) => {
    const files = selectedFiles[folderName]
    if (!files || files.length === 0) return

    setUploading(folderName)
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch(`${apiUrl}/project-files/${projectId}/files/${folderName}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Error uploading ${file.name}`)
        }
      }

      // Limpiar selección y recargar estructura
      setSelectedFiles(prev => ({ ...prev, [folderName]: null }))
      await loadStructure()
    } catch (error) {
      console.error('Error uploading files:', error)
      alert('Error al subir archivos')
    } finally {
      setUploading(null)
    }
  }

  const handleDownloadFile = async (folderName: string, filename: string) => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(
        `${apiUrl}/project-files/${projectId}/files/${folderName}/download/${filename}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading file:', error)
      alert('Error al descargar archivo')
    }
  }

  const handleDownloadFolder = async (folderName: string) => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(
        `${apiUrl}/project-files/${projectId}/files/${folderName}/download-zip`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${project?.code}_${folderName}.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading folder:', error)
      alert('Error al descargar carpeta')
    }
  }

  const handleDownloadAll = async () => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(
        `${apiUrl}/project-files/${projectId}/files/download-all`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${project?.code}_completo.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading all:', error)
      alert('Error al descargar proyecto completo')
    }
  }

  const handleDownloadTemplate = async () => {
    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(
        `${apiUrl}/project-files/${projectId}/files/planilla-costos`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'PlanillaCostos.xlsm'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading template:', error)
      alert('Error al descargar plantilla')
    }
  }

  const handleDeleteFile = async (folderName: string, filename: string) => {
    if (!confirm(`¿Estás seguro de eliminar ${filename}?`)) return

    try {
      const token = getToken()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar'

      const response = await fetch(
        `${apiUrl}/project-files/${projectId}/files/${folderName}/${filename}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        await loadStructure()
      } else {
        throw new Error('Error deleting file')
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      alert('Error al eliminar archivo')
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Proyecto no encontrado</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-500 mt-1">Código: {project.code}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleDownloadAll}
                variant="secondary"
              >
                📦 Descargar Todo
              </Button>
              <Button
                onClick={() => router.push('/proyectos')}
                variant="secondary"
              >
                ← Volver
              </Button>
            </div>
          </div>
          {project.description && (
            <p className="text-gray-700 mt-4">{project.description}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div>
              <span className="text-sm text-gray-500">Estado:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                project.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                project.status === 'PLANNING' ? 'bg-blue-100 text-blue-800' :
                project.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project.status}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Prioridad:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                project.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                project.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project.priority}
              </span>
            </div>
            {project.budget && (
              <div>
                <span className="text-sm text-gray-500">Presupuesto:</span>
                <span className="ml-2 text-sm font-semibold">${project.budget.toLocaleString()}</span>
              </div>
            )}
            {project.estimatedHours && (
              <div>
                <span className="text-sm text-gray-500">Horas estimadas:</span>
                <span className="ml-2 text-sm font-semibold">{project.estimatedHours}h</span>
              </div>
            )}
          </div>
        </div>

        {/* Archivos por carpeta */}
        <div className="grid gap-6">
          {FOLDERS.map(folder => {
            const folderData = structure.find(f => f.folderName === folder.name)
            const files = folderData?.files || []
            const selectedFileList = selectedFiles[folder.name]

            return (
              <div key={folder.name} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {folder.icon} {folder.label}
                    <span className="ml-2 text-sm text-gray-500">
                      ({files.length} archivo{files.length !== 1 ? 's' : ''})
                    </span>
                  </h2>
                  <div className="flex gap-2">
                    {folder.name === 'Costos' && (
                      <Button
                        onClick={handleDownloadTemplate}
                        variant="secondary"
                        size="sm"
                      >
                        📥 Plantilla Costos
                      </Button>
                    )}
                    {files.length > 0 && (
                      <Button
                        onClick={() => handleDownloadFolder(folder.name)}
                        variant="secondary"
                        size="sm"
                      >
                        📦 Descargar Carpeta
                      </Button>
                    )}
                  </div>
                </div>

                {/* Upload Section */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      multiple
                      onChange={(e) => handleFileSelect(folder.name, e.target.files)}
                      className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      disabled={uploading === folder.name}
                    />
                    <Button
                      onClick={() => handleUpload(folder.name)}
                      disabled={!selectedFileList || selectedFileList.length === 0 || uploading === folder.name}
                      size="sm"
                    >
                      {uploading === folder.name ? 'Subiendo...' : 'Subir'}
                    </Button>
                  </div>
                  {selectedFileList && selectedFileList.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      {selectedFileList.length} archivo{selectedFileList.length !== 1 ? 's' : ''} seleccionado{selectedFileList.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                {/* Files List */}
                {files.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Archivo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tamaño
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {files.map((file, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {file.filename}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatBytes(file.size)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(file.uploadDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleDownloadFile(folder.name, file.filename)}
                                className="text-blue-600 hover:text-blue-900 mr-4"
                              >
                                Descargar
                              </button>
                              <button
                                onClick={() => handleDeleteFile(folder.name, file.filename)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No hay archivos en esta carpeta
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
