'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import ConfirmDialog from '@/components/ConfirmDialog'

interface UserItem {
  id: string
  name?: string
  email: string
  role: string
  allowedModules: string[]
  isActive: boolean
  createdAt: string
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formConfirmPassword, setFormConfirmPassword] = useState('')
  const [showFormPassword, setShowFormPassword] = useState(false)
  const [showFormConfirmPassword, setShowFormConfirmPassword] = useState(false)
  const [formRole, setFormRole] = useState('GERENTE')
  const [formModules, setFormModules] = useState<string[]>(['inventory', 'projects', 'reports'])
  const [formIsActive, setFormIsActive] = useState(true)

  // Confirm delete modal
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/users')
      if (Array.isArray(res.data)) {
        setUsers(res.data)
      }
    } catch (err: any) {
      setError('Error al cargar la lista de usuarios. Asegúrate de tener permisos de Super Admin.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreateModal = () => {
    setEditingUser(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormConfirmPassword('')
    setShowFormPassword(false)
    setShowFormConfirmPassword(false)
    setFormRole('GERENTE')
    setFormModules(['inventory', 'projects', 'reports'])
    setFormIsActive(true)
    setShowModal(true)
  }

  const handleOpenEditModal = (user: UserItem) => {
    setEditingUser(user)
    setFormName(user.name || '')
    setFormEmail(user.email)
    setFormPassword('')
    setFormConfirmPassword('')
    setShowFormPassword(false)
    setShowFormConfirmPassword(false)
    setFormRole(user.role)
    setFormModules(Array.isArray(user.allowedModules) ? user.allowedModules : [])
    setFormIsActive(user.isActive)
    setShowModal(true)
  }

  const handleToggleModule = (moduleKey: string) => {
    setFormModules(prev =>
      prev.includes(moduleKey) ? prev.filter(m => m !== moduleKey) : [...prev, moduleKey]
    )
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (formPassword || !editingUser) {
        if (formPassword !== formConfirmPassword) {
          alert('Las contraseñas no coinciden. Por favor confirma la contraseña.')
          return
        }
      }

      const payload: any = {
        name: formName,
        email: formEmail,
        role: formRole,
        allowedModules: formModules,
        isActive: formIsActive,
      }

      if (formPassword) {
        payload.password = formPassword
      }

      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, payload)
      } else {
        if (!formPassword) {
          alert('Debes asignar una contraseña para el nuevo usuario')
          return
        }
        await api.post('/users', payload)
      }

      setShowModal(false)
      fetchUsers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al guardar el usuario')
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    try {
      const res = await api.delete(`/users/${userToDelete.id}`)
      if (res.data?.message) {
        alert(res.data.message)
      }
      setUserToDelete(null)
      fetchUsers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar el usuario')
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800 font-semibold">Super Admin</span>
      case 'GERENTE':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-semibold">Gerente</span>
      case 'JEFE_PROYECTO':
      case 'JEFE':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-300 dark:border-sky-800 font-semibold">Jefe de Proyecto</span>
      case 'BODEGUERO':
        return <span className="px-2.5 py-1 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-semibold">Bodeguero</span>
      default:
        return <span className="px-2.5 py-1 text-xs rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-semibold">{role}</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <span>👥</span> Gestión de Usuarios
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Administración de cuentas, roles y asignación de permisos de módulos.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-lg transition active:scale-95 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>+</span> Nuevo Usuario
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 rounded-xl text-sm border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Users List Container */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">Cargando usuarios...</div>
        ) : (
          <>
            {/* MOBILE CARDS VIEW */}
            <div className="block md:hidden space-y-3">
              {users.map((u) => (
                <div key={u.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3 shadow-sm text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{u.name || 'Sin Nombre'}</h4>
                      <p className="text-slate-400 font-mono text-[11px]">{u.email}</p>
                    </div>
                    {getRoleBadge(u.role)}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {(u.allowedModules || []).includes('inventory') && (
                      <span className="px-2 py-0.5 text-[10px] rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">📦 Bodega</span>
                    )}
                    {(u.allowedModules || []).includes('projects') && (
                      <span className="px-2 py-0.5 text-[10px] rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">📊 Proyectos</span>
                    )}
                    {(u.allowedModules || []).includes('reports') && (
                      <span className="px-2 py-0.5 text-[10px] rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">📋 Reportes</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${u.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-600'}`}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <div className="space-x-3">
                      <button onClick={() => handleOpenEditModal(u)} className="text-blue-600 font-bold">✏️ Editar</button>
                      <button onClick={() => setUserToDelete(u)} className="text-red-600 font-bold">🗑️ Eliminar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE VIEW */}
            <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="p-4 font-semibold">Nombre</th>
                      <th className="p-4 font-semibold">Email</th>
                      <th className="p-4 font-semibold">Rol</th>
                      <th className="p-4 font-semibold">Módulos</th>
                      <th className="p-4 font-semibold">Estado</th>
                      <th className="p-4 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="p-4 font-medium">{u.name || 'Sin Nombre'}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-mono text-xs">{u.email}</td>
                        <td className="p-4">{getRoleBadge(u.role)}</td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5">
                            {(u.allowedModules || []).includes('inventory') && (
                              <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                <span>📦</span> Bodega
                              </span>
                            )}
                            {(u.allowedModules || []).includes('projects') && (
                              <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                <span>📊</span> Proyectos
                              </span>
                            )}
                            {(u.allowedModules || []).includes('reports') && (
                              <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                                <span>📋</span> Reportes
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          {u.isActive ? (
                            <span className="px-2.5 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-semibold">
                              Activo
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 text-xs rounded-full bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-semibold">
                              Inactivo
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => setUserToDelete(u)}
                            className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 hover:underline"
                          >
                            🗑️ Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Crear / Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] my-auto flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
              <h3 className="text-lg font-bold">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-sm overflow-y-auto pr-1 flex-1">
              <div>
                <label className="block font-semibold mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Email / Usuario</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Contraseña {editingUser && '(Dejar en blanco para conservar la actual)'}
                </label>
                <div className="relative">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingUser ? '••••••••' : 'Ingrese contraseña'}
                    className="w-full px-3 py-2 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold"
                  >
                    {showFormPassword ? '🙈 Ocultar' : '👁️ Ver'}
                  </button>
                </div>
              </div>

              {(formPassword || !editingUser) && (
                <div>
                  <label className="block font-semibold mb-1">Confirmar Contraseña</label>
                  <div className="relative">
                    <input
                      type={showFormConfirmPassword ? 'text' : 'password'}
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      placeholder="Repita la contraseña"
                      className="w-full px-3 py-2 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormConfirmPassword(!showFormConfirmPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold"
                    >
                      {showFormConfirmPassword ? '🙈 Ocultar' : '👁️ Ver'}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold mb-1">Rol en el Sistema</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-semibold"
                >
                  <option value="SUPER_ADMIN">⚡ Super Admin (Acceso Total)</option>
                  <option value="GERENTE">💼 Gerente / Administración</option>
                  <option value="JEFE_PROYECTO">🏗️ Jefe de Proyecto</option>
                  <option value="BODEGUERO">📦 Bodeguero</option>
                  <option value="TECNICO">🔧 Técnico en Terreno</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-xs">Módulos Permitidos</label>
                <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formModules.includes('inventory')}
                      onChange={() => handleToggleModule('inventory')}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                    />
                    <span>📦 Inventario y Bodega</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formModules.includes('projects')}
                      onChange={() => handleToggleModule('projects')}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                    />
                    <span>🏗️ Proyectos y Terreno</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formModules.includes('reports')}
                      onChange={() => handleToggleModule('reports')}
                      className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                    />
                    <span>📋 Reportes y Actividades</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600"
                />
                <label htmlFor="isActiveToggle" className="cursor-pointer font-medium">
                  Cuenta Activa
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!userToDelete}
        title="Eliminar Usuario"
        message={`¿Estás seguro de que deseas eliminar la cuenta de ${userToDelete?.name || userToDelete?.email}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  )
}
