import { User } from '@/types'

export const setAuthToken = (token: string) => {
  console.log('🔑 Guardando token:', token.substring(0, 20) + '...');
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', token);
  }
  console.log('✅ Token guardado en localStorage');
}

export const getAuthToken = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const token = localStorage.getItem('access_token');
  console.log('🔍 Obteniendo token:', token ? 'Existe' : 'No existe');
  return token || undefined;
}

export const removeAuthToken = () => {
  console.log('🗑️ Eliminando token');
  if (typeof window !== 'undefined') {
    localStorage.removeItem('access_token');
  }
}

export const setUser = (user: User) => {
  console.log('👤 Guardando usuario:', user.email);
  localStorage.setItem('user', JSON.stringify(user));
}

export const getUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  console.log('👤 Obteniendo usuario:', user ? user.email : 'No existe');
  return user;
}

export const removeUser = () => {
  localStorage.removeItem('user')
}

export const logout = () => {
  removeAuthToken()
  removeUser()
  // Redirigir al login principal del sistema (fuera de /inventory)
  window.location.href = '/login.html'
}

export const isAuthenticated = (): boolean => {
  return !!getAuthToken()
}

export const isAdmin = (): boolean => {
  const user = getUser()
  return user?.role === 'GERENTE' || user?.role === 'SUPER_ADMIN'
}

export const hasModuleAccess = (module: string): boolean => {
  const user = getUser()
  if (!user) return false
  if (user.role === 'SUPER_ADMIN') return true
  return Array.isArray(user.allowedModules) && user.allowedModules.includes(module)
}
