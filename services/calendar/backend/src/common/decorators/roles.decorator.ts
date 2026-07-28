import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Decorador para especificar los roles permitidos en un endpoint
 * @example @Roles('SUPER_ADMIN', 'GERENTE')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
