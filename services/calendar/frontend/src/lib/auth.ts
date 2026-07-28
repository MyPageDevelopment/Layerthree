'use client'

import { User } from '@/types'

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access_token')
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

export function getUserData(): User | null {
  return getUser()
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function isAdmin(): boolean {
  const user = getUser()
  return user?.role === 'GERENTE' || user?.role === 'SUPER_ADMIN'
}

export function isSuperAdmin(): boolean {
  const user = getUser()
  return user?.role === 'SUPER_ADMIN'
}

export function hasModuleAccess(module: string): boolean {
  const user = getUser()
  if (!user) return false
  if (user.role === 'SUPER_ADMIN') return true
  return user.allowedModules?.includes(module) ?? false
}

export function logout(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('user')
  window.location.href = '/login.html'
}

export function requireAuth(): void {
  if (!isAuthenticated()) {
    window.location.href = '/login.html'
  }
}

export function requireModuleAccess(module: string): void {
  if (!hasModuleAccess(module)) {
    window.location.href = '/dashboard.html'
  }
}
