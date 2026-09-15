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

export interface QuotationItem {
  id?: string
  productName: string
  productId?: string
  product?: Product
  quantity: number
  unitMeasure?: string
  estimatedUnitPrice?: number
  supplier?: string
  itemNotes?: string
  linkUrl?: string
  serialNumber?: string
}

export interface QuotationRequest {
  id: string
  code: string
  customCode?: string
  destinationType: 'PROYECTO' | 'STOCK_BODEGA'
  deliveryType?: 'RETIRO_SUCURSAL' | 'DESPACHO_DOMICILIO'
  projectId?: string
  projectName?: string
  requestedById: string
  requestedBy?: {
    id: string
    name?: string
    email: string
    role: string
  }
  assignedToId?: string
  assignedTo?: {
    id: string
    name?: string
    email: string
    role: string
  }
  pickupWorkerId?: string
  pickupWorker?: {
    id: string
    name?: string
    email: string
    role: string
  }
  pickupWorkerName?: string
  notificationEmail?: string
  status: 'PENDING_QUOTE' | 'QUOTED' | 'ORDER_PLACED' | 'IN_PROCESSING' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED'
  title: string
  notes?: string
  attachmentUrl?: string
  attachmentName?: string
  ocAttachmentUrl?: string
  ocAttachmentName?: string
  invoiceAttachmentUrl?: string
  invoiceAttachmentName?: string
  documentsJson?: string
  bodegueroNotes?: string
  responseAttachmentUrl?: string
  responseAttachmentName?: string
  totalEstimatedCost: number
  supplierRut?: string
  supplierName?: string
  invoiceNumber?: string
  items: QuotationItem[]
  createdAt: string
  updatedAt: string
}
