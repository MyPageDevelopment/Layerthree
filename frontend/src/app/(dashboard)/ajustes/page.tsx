'use client'

import { useState, useEffect } from 'react'
import { getUser, setUser } from '@/lib/auth'
import api from '@/lib/api'
import type { User } from '@/types'

export default function AjustesPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Nombre
  const [name, setName] = useState('')
  const [nameSuccess, setNameSuccess] = useState('')
  const [nameError, setNameError] = useState('')
  const [updatingName, setUpdatingName] = useState(false)

  // Cambio de contraseña con código
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [passError, setPassError] = useState('')
  const [passSuccess, setPassSuccess] = useState('')
  const [updatingPass, setUpdatingPass] = useState(false)

  useEffect(() => {
    const u = getUser()
    if (u) {
      setCurrentUser(u)
      setName(u.name || '')
    }
  }, [])

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameSuccess('')
    setNameError('')
    setUpdatingName(true)

    try {
      if (currentUser?.id) {
        await api.patch(`/users/${currentUser.id}`, { name })
      }
      const updated = { ...currentUser!, name }
      setUser(updated, true)
      setCurrentUser(updated)
      setNameSuccess('Nombre actualizado correctamente.')
    } catch (err: any) {
      setNameError(err.response?.data?.message || 'Error al actualizar nombre')
    } finally {
      setUpdatingName(false)
    }
  }

  const handleSendVerificationCode = async () => {
    if (!currentUser?.email) return
    setSendingEmail(true)
    setPassError('')
    setPassSuccess('')

    try {
      const res = await api.post('/auth/forgot-password', { email: currentUser.email })
      setPassSuccess(res.data.message || 'Código de verificación enviado a tu correo.')
      if (res.data.devToken) {
        setToken(res.data.devToken)
      }
      setForgotStep(2)
    } catch (err: any) {
      setPassError(err.response?.data?.message || 'Error al solicitar código de verificación')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPassError('')
    setPassSuccess('')

    if (newPassword !== confirmPassword) {
      setPassError('Las contraseñas no coinciden')
      return
    }

    if (newPassword.length < 6) {
      setPassError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setUpdatingPass(true)

    try {
      await api.post('/auth/reset-password', {
        email: currentUser?.email,
        token,
        newPassword,
      })

      setPassSuccess('¡Contraseña actualizada exitosamente!')
      setNewPassword('')
      setConfirmPassword('')
      setToken('')
      setForgotStep(3)
    } catch (err: any) {
      setPassError(err.response?.data?.message || 'Código inválido o expirado')
    } finally {
      setUpdatingPass(false)
    }
  }

  if (!currentUser) {
    return <div className="py-12 text-center text-slate-400">Cargando ajustes de perfil...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>⚙️</span> Ajustes de Perfil y Cuenta
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gestiona tu información personal, correo y credenciales de acceso seguro.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Card Sidebar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 h-fit">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 rounded-2xl bg-blue-600 text-white font-extrabold text-3xl flex items-center justify-center shadow-lg">
              {currentUser.name ? currentUser.name[0].toUpperCase() : currentUser.email[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{currentUser.name || 'Usuario'}</h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-full border border-blue-200 dark:border-blue-800">
                Rol: {currentUser.role}
              </span>
            </div>
          </div>
        </div>

        {/* Main Settings Panel */}
        <div className="md:col-span-2 space-y-6">
          {/* Datos Personales */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>👤</span> Información Personal
            </h2>

            {nameSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs border border-emerald-200 dark:border-emerald-800">
                {nameSuccess}
              </div>
            )}
            {nameError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-xl text-xs border border-red-200 dark:border-red-800">
                {nameError}
              </div>
            )}

            <form onSubmit={handleUpdateName} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Correo Electrónico (No modificable)</label>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-slate-400 rounded-xl cursor-not-allowed font-mono text-xs"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updatingName}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs sm:text-sm transition shadow disabled:opacity-50"
                >
                  {updatingName ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>

          {/* Seguridad y Cambio de Contraseña */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>🔒</span> Cambio Seguro de Contraseña (Verificación por Correo)
            </h2>

            {passSuccess && forgotStep !== 3 && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs border border-emerald-200 dark:border-emerald-800 font-semibold">
                {passSuccess}
              </div>
            )}
            {passError && (
              <div className="p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-xl text-xs border border-red-200 dark:border-red-800 font-semibold">
                {passError}
              </div>
            )}

            {forgotStep === 1 ? (
              <div className="space-y-3 text-xs sm:text-sm">
                <p className="text-slate-500 dark:text-slate-400">
                  Por razones de seguridad, enviaremos un código de validación a tu correo registrado <strong className="text-slate-800 dark:text-slate-200 font-mono">{currentUser.email}</strong> para autorizar el cambio de clave.
                </p>

                <button
                  type="button"
                  onClick={handleSendVerificationCode}
                  disabled={sendingEmail}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold rounded-xl transition shadow text-xs sm:text-sm flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  <span>✉️</span>
                  <span>{sendingEmail ? 'Enviando Código...' : 'Enviar Código de Verificación al Correo'}</span>
                </button>
              </div>
            ) : forgotStep === 2 ? (
              <form onSubmit={handleChangePassword} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Código de Verificación (Recibido por correo)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ingresa el token de 6 dígitos"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-mono text-center tracking-widest text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Nueva Contraseña</label>
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Confirmar Nueva Contraseña</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la clave"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => handleSendVerificationCode()}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    ← Reenviar código por correo
                  </button>

                  <button
                    type="submit"
                    disabled={updatingPass}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs sm:text-sm transition shadow disabled:opacity-50"
                  >
                    {updatingPass ? 'Actualizando...' : 'Confirmar Nueva Contraseña'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-3">
                <span className="text-3xl block">🎉</span>
                <h4 className="font-extrabold text-sm text-emerald-900 dark:text-emerald-300">
                  ¡Contraseña Actualizada Exitosamente!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Tu nueva clave ha sido guardada. El proceso ha finalizado correctamente.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForgotStep(1)
                    setPassSuccess('')
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow"
                >
                  Entendido
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
