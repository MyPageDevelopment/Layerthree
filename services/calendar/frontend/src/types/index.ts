/**
 * Interfaces TypeScript sincronizadas con el Backend (UUID)
 * Última actualización: 2025-01-02
 */

export interface User {
  id: string  // UUID - CORREGIDO de number a string
  email: string
  name: string
  role: 'SUPER_ADMIN' | 'GERENTE' | 'JEFE' | 'TECNICO'
  allowedModules?: string[]  // JSON array parseado
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string  // UUID - CORREGIDO de number a string
  code: string
  name: string
  description?: string
  status: 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  startDate?: string
  endDate?: string
  budget?: number
  estimatedHours?: number
  actualHours: number
  ownerId: string  // UUID
  managerId?: string  // UUID
  clientName?: string
  location?: string
  tags?: string  // JSON array
  createdAt: string
  updatedAt: string
  // Relaciones
  owner?: User
  manager?: User
}

export interface Task {
  id: string  // UUID
  code: string
  title: string
  description?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  projectId: string  // UUID
  startDate?: string
  endDate?: string
  dueDate?: string
  completedAt?: string
  estimatedHours?: number
  actualHours: number
  progress: number
  parentTaskId?: string  // UUID
  milestoneId?: string  // UUID
  shiftTypeId?: string  // UUID - NUEVO: Tipo de jornada
  tags?: string  // JSON array
  notes?: string
  createdAt: string
  updatedAt: string
  freeBusyStatus: 'FREE' | 'BUSY' | 'TENTATIVE' | 'OUT_OF_OFFICE'
  isRecurring: boolean
  location?: string
  timezone: string
  visibility: 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL'
  // Relaciones
  project?: Project
  parentTask?: Task
  subtasks?: Task[]
  shiftType?: ShiftType  // NUEVO: Relación con tipo de jornada
}

export interface TimeEntry {
  id: string  // UUID - CORREGIDO de number a string
  userId: string  // UUID - CORREGIDO de number a string
  taskId: string  // UUID - NUEVO campo para reemplazar projectId
  startTime: string
  endTime?: string
  duration?: number
  description?: string
  createdAt: string
  updatedAt: string
  // Relaciones
  task?: Task
  user?: User
}

export interface ShiftType {
  id: string  // UUID
  code: string
  name: string
  color: string  // Hex color (#RRGGBB)
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}
