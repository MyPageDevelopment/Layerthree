/**
 * Interfaces TypeScript sincronizadas con el Backend (UUID)
 * Última actualización: 2025-01-02
 */

export interface User {
  id: string  // UUID (ya era correcto)
  email: string
  name: string
  // CORREGIDO: Roles sincronizados con Auth Service
  role: 'SUPER_ADMIN' | 'GERENTE' | 'JEFE' | 'TECNICO'
  allowedModules?: string[]  // JSON array parseado
  isActive: boolean  // NUEVO: agregado para consistencia
  createdAt: string
  updatedAt: string  // NUEVO: agregado para consistencia
}

export type ProductCategory = 
  | 'EQUIPOS'
  | 'RED'
  | 'FIBRA_OPTICA'
  | 'ELECTRICIDAD'
  | 'CANALIZACION'
  | 'INSUMOS'

export interface Product {
  id: string
  sku: string
  name: string
  description?: string
  category: ProductCategory
  subcategory?: string
  stock: number
  minStock: number
  unitPrice: number
  createdAt: string
  updatedAt: string
}

export interface Movement {
  id: string
  productId: string
  product?: Product
  projectId: string
  type: 'ENTRY' | 'EXIT'
  quantity: number
  notes?: string
  userId: string
  user?: User
  createdAt: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  user: User
}
