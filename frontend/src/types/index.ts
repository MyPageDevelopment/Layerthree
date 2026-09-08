export interface User {
  id: string
  email: string
  name: string
  role: 'SUPER_ADMIN' | 'GERENTE' | 'JEFE_PROYECTO' | 'BODEGUERO' | 'JEFE' | 'TECNICO'
  allowedModules?: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
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
  unit?: string
  unitCost?: number
  totalCost?: number
  listPrice?: number
  supplierCode?: string
  serialNumber?: string
  location?: string
  createdAt: string
  updatedAt: string
}

export interface VanItem {
  id: string
  vanId: string
  productId?: string
  product?: Product
  name: string
  sku?: string
  category: string
  type: string
  quantity: number
  minQuantity: number
  assignedTo?: string
  serialNumber?: string
}

export interface Van {
  id: string
  plate: string
  name: string
  driver?: string
  status: string
  notes?: string
  mileage?: number
  lastOilChangeKm?: number
  nextOilChangeKm?: number
  lastOilChangeDate?: string
  lastTireChangeDate?: string
  technicalReviewDate?: string
  insuranceExpiryDate?: string
  permisoCirculacionDate?: string
  totalItems?: number
  toolsCount?: number
  materialsCount?: number
  items?: VanItem[]
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
