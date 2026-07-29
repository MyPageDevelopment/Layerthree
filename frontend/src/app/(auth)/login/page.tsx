'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { setAuthToken, setUser } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [keepSession, setKeepSession] = useState(true)
  const [failedAttempts, setFailedAttempts] = useState(0)

  // Password reset modal state
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [forgotStep, setForgotStep] = useState<1 | 2>(1)
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotError, setForgotError] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { email, password })
      const { access_token, user } = response.data

      setAuthToken(access_token, keepSession)
      setUser(user, keepSession)
      setFailedAttempts(0)
      router.push('/bodega')
    } catch (err: any) {
      console.error('Error durante login:', err)
      if (err.response?.status === 401) {
        const nextCount = failedAttempts + 1
        setFailedAttempts(nextCount)
        if (nextCount >= 5) {
          setError('⚠️ Has alcanzado el límite máximo de 5 intentos fallidos. Por seguridad la cuenta se bloquea por 1 minuto.')
        } else {
          setError(`Credenciales inválidas. Intentos fallidos: ${nextCount}/5`)
        }
      } else if (err.response?.status === 429) {
        setError('⚠️ Demasiados intentos en poco tiempo. Por seguridad debes esperar 1 minuto.')
      } else {
        setError(err.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotMessage('')

    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail })
      setForgotMessage(res.data.message)
      if (res.data.devToken) {
        setForgotMessage(`Código enviado: ${res.data.devToken} (Ingresa este código a continuación)`)
      }
      setForgotStep(2)
    } catch (err: any) {
      setForgotError('Error al procesar la solicitud. Verifica el correo ingresado.')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotMessage('')

    try {
      const res = await api.post('/auth/reset-password', {
        email: forgotEmail,
        token: resetToken,
        password: newPassword,
      })
      alert(res.data.message)
      setShowForgotModal(false)
      setForgotStep(1)
      setForgotEmail('')
      setResetToken('')
      setNewPassword('')
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Error al restablecer la contraseña.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">📦</span>
          <h1 className="text-2xl font-bold text-white">Sistema Intranet</h1>
          <p className="text-slate-400 text-sm mt-1">Plataforma de Gestión Layerthree</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-sm flex items-center justify-between">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@layerthree.cl"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Keep Session & Forgot Password */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={keepSession}
                onChange={(e) => setKeepSession(e.target.checked)}
                className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 bg-slate-800"
              />
              <span>Mantener sesión activa</span>
            </label>

            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="text-blue-400 hover:underline font-medium"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Modal Olvidé mi contraseña */}
        {showForgotModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white">Recuperar Contraseña</h3>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="text-slate-400 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              {forgotError && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs">
                  {forgotError}
                </div>
              )}

              {forgotMessage && (
                <div className="p-3 bg-blue-950/60 border border-blue-800 text-blue-300 rounded-xl text-xs">
                  {forgotMessage}
                </div>
              )}

              {forgotStep === 1 ? (
                <form onSubmit={handleSendForgotEmail} className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Ingresa tu dirección de correo registrada para enviar las instrucciones de recuperación.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="correo@layerthree.cl"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition"
                  >
                    Enviar Código de Recuperación
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Código Recibido</label>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Ej: ABC123"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nueva Contraseña</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 pr-9 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition text-xs"
                      >
                        {showNewPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl text-sm transition"
                  >
                    Guardar Nueva Contraseña
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
