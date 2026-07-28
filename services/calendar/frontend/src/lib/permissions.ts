/**
 * Utilidades para manejo de permisos basados en roles
 */

export type UserRole = 'SUPER_ADMIN' | 'GERENTE' | 'JEFE' | 'TECNICO';

interface User {
  role: UserRole;
  id: string;
}

/**
 * Verifica si el usuario puede crear/editar proyectos y tareas
 */
export function canCreateEdit(user: User | null): boolean {
  if (!user) return false;
  return ['SUPER_ADMIN', 'GERENTE', 'JEFE'].includes(user.role);
}

/**
 * Verifica si el usuario puede eliminar proyectos y tareas
 */
export function canDelete(user: User | null): boolean {
  if (!user) return false;
  return ['SUPER_ADMIN', 'GERENTE', 'JEFE'].includes(user.role);
}

/**
 * Verifica si el usuario puede cambiar el estado de una tarea
 * Los TECNICOS solo pueden cambiar estado de tareas asignadas
 */
export function canChangeStatus(user: User | null): boolean {
  if (!user) return false;
  return ['SUPER_ADMIN', 'GERENTE', 'JEFE', 'TECNICO'].includes(user.role);
}

/**
 * Verifica si el usuario puede ver todos los proyectos
 * Los TECNICOS solo ven sus tareas asignadas
 */
export function canViewAll(user: User | null): boolean {
  if (!user) return false;
  return ['SUPER_ADMIN', 'GERENTE', 'JEFE'].includes(user.role);
}

/**
 * Verifica si el usuario es TECNICO (vista limitada)
 */
export function isTecnico(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'TECNICO';
}

/**
 * Obtiene el label legible del rol
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    GERENTE: 'Gerente',
    JEFE: 'Jefe',
    TECNICO: 'Técnico'
  };
  
  return labels[role] || role;
}
