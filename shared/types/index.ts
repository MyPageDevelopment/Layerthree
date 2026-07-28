/**
 * TIPOS COMPARTIDOS - SISTEMA INTRANET LAYERTHREE
 * Estos tipos son utilizados por todos los microservicios
 */

// ========== AUTENTICACIÓN ==========
export enum UserRole {
  ADMIN = 'ADMIN',
  VIEWER = 'VIEWER',
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER'
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  department?: string
  createdAt: string
  updatedAt: string
}

export interface AuthToken {
  access_token: string
  refresh_token?: string
  expires_in: number
}

export interface AuthResponse {
  user: User
  token: AuthToken
}

// ========== RESPUESTAS API ==========
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
  timestamp: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ========== ERRORES ==========
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export interface ApiError {
  code: ErrorCode
  message: string
  details?: any
  timestamp: string
}

// ========== INVENTARIO (BODEGA) ==========
export enum ProductCategory {
  EQUIPOS = 'EQUIPOS',
  RED = 'RED',
  FIBRA_OPTICA = 'FIBRA_OPTICA',
  ELECTRICIDAD = 'ELECTRICIDAD',
  CANALIZACION = 'CANALIZACION',
  INSUMOS = 'INSUMOS'
}

export enum MovementType {
  ENTRY = 'ENTRY',
  EXIT = 'EXIT'
}

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
  projectId?: string
  type: MovementType
  quantity: number
  notes?: string
  userId: string
  user?: User
  createdAt: string
}

// ========== EVENTOS (Para comunicación entre microservicios) ==========
export interface DomainEvent {
  eventId: string
  eventType: string
  service: string
  timestamp: string
  data: any
}

// Eventos de Inventario
export interface StockUpdatedEvent extends DomainEvent {
  eventType: 'inventory.stock.updated'
  data: {
    productId: string
    oldStock: number
    newStock: number
    reason: string
  }
}

export interface ProductCreatedEvent extends DomainEvent {
  eventType: 'inventory.product.created'
  data: Product
}

// ========== CONFIGURACIÓN ==========
export interface ServiceConfig {
  serviceName: string
  version: string
  port: number
  environment: 'development' | 'production' | 'test'
  database: {
    host: string
    port: number
    name: string
  }
  jwt: {
    secret: string
    expiresIn: string
  }
}

// ========== AUDIT LOG ==========
export interface AuditLog {
  id: string
  userId: string
  action: string
  service: string
  resource: string
  resourceId: string
  changes?: any
  ipAddress?: string
  userAgent?: string
  createdAt: string
}
