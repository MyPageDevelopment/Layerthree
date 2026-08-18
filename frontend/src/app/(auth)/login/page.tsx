'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { setAuthToken, setUser } from '@/lib/auth'
import LoadingOverlay from '@/components/LoadingOverlay'

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
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1)
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [resetSuccessMessage, setResetSuccessMessage] = useState('')
  const [resendTimer, setResendTimer] = useState<number>(0)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('Procesando...')

  useEffect(() => {
    if (resendTimer <= 0) return
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [resendTimer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoadingMessage('Iniciando sesión...')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { email, password })
      const { access_token, user } = response.data

      setAuthToken(access_token, keepSession)
      setUser(user, keepSession)
      setFailedAttempts(0)
      router.push('/bodega')
    } catch (err: any) {
      const nextCount = failedAttempts + 1
      setFailedAttempts(nextCount)
      if (err.response?.status === 401) {
        if (nextCount >= 5) {
          setError('⚠️ Has alcanzado el límite de 5 intentos fallidos. Por seguridad la cuenta se bloquea por 1 minuto.')
        } else {
          setError(`Credenciales inválidas. Intentos fallidos: ${nextCount}/5`)
        }
      } else if (err.response?.status === 429) {
        setError('⚠️ Demasiados intentos en poco tiempo. Por seguridad debes esperar 1 minuto.')
      } else {
        setError(err.response?.data?.message || `Credenciales inválidas. Intentos fallidos: ${nextCount}/5`)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotMessage('')
    setLoadingMessage('Enviando código de recuperación a tu correo...')
    setLoading(true)

    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail })
      setForgotMessage(res.data.message || 'Se ha enviado un código de verificación de 6 dígitos a tu correo.')
      setForgotStep(2)
      setResendTimer(60)
    } catch (err: any) {
      setForgotError('Error al procesar la solicitud. Verifica el correo ingresado.')
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (resendTimer > 0) return
    setForgotError('')
    setForgotMessage('')
    setLoadingMessage('Reenviando nuevo código de verificación...')
    setLoading(true)

    try {
      const res = await api.post('/auth/forgot-password', { email: forgotEmail })
      setForgotMessage(res.data.message || 'Se ha reenviado un nuevo código de verificación a tu correo.')
      setResendTimer(60)
    } catch (err: any) {
      setForgotError('Error al reenviar el código. Inténtalo nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotMessage('')
    setResetSuccessMessage('')

    if (newPassword !== confirmNewPassword) {
      setForgotError('Las contraseñas no coinciden. Por favor confirma la nueva contraseña.')
      return
    }

    setLoadingMessage('Actualizando contraseña de manera segura...')
    setLoading(true)

    try {
      const res = await api.post('/auth/reset-password', {
        email: forgotEmail,
        token: resetToken,
        password: newPassword,
      })
      const msg = res.data.message || 'Contraseña actualizada exitosamente.'
      setResetSuccessMessage(msg)
      setForgotStep(3)
    } catch (err: any) {
      setForgotError(err.response?.data?.message || 'Error al restablecer la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <span className="text-5xl block mb-3">📦</span>
          <h1 className="text-2xl font-bold text-white">Layerthree</h1>
          <p className="text-slate-400 text-sm mt-1">Plataforma de Gestión Corporativa</p>
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
                className="w-full px-4 py-2.5 pr-11 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={keepSession}
                onChange={(e) => setKeepSession(e.target.checked)}
                className="w-4 h-4 bg-slate-800 border-slate-700 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-slate-400">Mantener sesión iniciada</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setShowForgotModal(true)
                setForgotStep(1)
                setForgotError('')
                setForgotMessage('')
                setResetSuccessMessage('')
              }}
              className="text-blue-400 hover:text-blue-300 transition"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/20 disabled:opacity-50"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* MODAL RECUPERACIÓN DE CONTRASEÑA */}
        {showForgotModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
                <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs flex items-center gap-2">
                  <span>⚠️</span> {forgotError}
                </div>
              )}

              {forgotMessage && (
                <div className="p-3 bg-blue-950/80 border border-blue-800 text-blue-300 rounded-xl text-xs flex items-center gap-2">
                  <span>ℹ️</span> {forgotMessage}
                </div>
              )}

              {resetSuccessMessage && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span>✅</span> {resetSuccessMessage}
                </div>
              )}

              {forgotStep === 1 ? (
                <form onSubmit={handleSendForgotEmail} className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Ingresa tu correo corporativo. Te enviaremos un código de verificación seguro para restablecer tu contraseña.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="usuario@layerthree.cl"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm transition"
                  >
                    Enviar Código de Verificación
                  </button>
                </form>
              ) : forgotStep === 2 ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-semibold text-slate-300">Código Recibido</label>
                      <button
                        type="button"
                        disabled={resendTimer > 0}
                        onClick={handleResendCode}
                        className={`text-xs font-semibold ${
                          resendTimer > 0
                            ? 'text-slate-500 cursor-not-allowed'
                            : 'text-blue-400 hover:text-blue-300 underline'
                        }`}
                      >
                        {resendTimer > 0 ? `Reenviar código (${resendTimer}s)` : '🔄 Reenviar código'}
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Ej: 123456"
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Confirmar Nueva Contraseña</label>
                    <div className="relative">
                      <input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 pr-9 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition text-xs"
                      >
                        {showConfirmNewPassword ? '🙈' : '👁️'}
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
              ) : (
                <div className="p-4 text-center space-y-3">
                  <span className="text-4xl block">🎉</span>
                  <h4 className="font-extrabold text-sm text-white">¡Contraseña Restablecida Con Éxito!</h4>
                  <p className="text-xs text-slate-300">
                    Tu clave ha sido cambiada correctamente. Ya puedes iniciar sesión en la plataforma con tu nueva contraseña.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false)
                      setForgotStep(1)
                      setForgotEmail('')
                      setResetToken('')
                      setNewPassword('')
                      setConfirmNewPassword('')
                      setResetSuccessMessage('')
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition shadow"
                  >
                    Entendido (Ir a Iniciar Sesión)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <LoadingOverlay isOpen={loading} message={loadingMessage} />
    </div>
  )
}
