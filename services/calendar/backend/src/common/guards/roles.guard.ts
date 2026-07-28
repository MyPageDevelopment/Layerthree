import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import * as jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';

/**
 * Guard para verificar que el usuario tenga uno de los roles permitidos
 * 
 * Jerarquía de roles:
 * - SUPER_ADMIN: Acceso total a todo
 * - GERENTE: Puede crear y editar proyectos y tareas, y eliminarlas
 * - JEFE: Puede crear y editar proyectos y tareas  
 * - TECNICO: Solo puede ver tareas asignadas y cambiar su estado
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private jwtSecret: string;

  constructor(private reflector: Reflector) {
    // Leer el secreto JWT
    try {
      this.jwtSecret = readFileSync('/run/secrets/jwt_secret', 'utf8').trim();
    } catch {
      this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // Sin restricción de roles
    }

    const request = context.switchToHttp().getRequest();
    let user = request.user;

    console.log('[RolesGuard] Usuario en request:', user);

    // Si no hay usuario en el request, intentar extraerlo del JWT
    if (!user) {
      const authHeader = request.headers.authorization;
      
      console.log('[RolesGuard] No hay usuario, verificando header:', authHeader);

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('[RolesGuard] No hay token válido');
        throw new UnauthorizedException('Token de autenticación no proporcionado');
      }

      const token = authHeader.substring(7);
      console.log('[RolesGuard] Token extraído:', token.substring(0, 50) + '...');

      try {
        const decoded = jwt.verify(token, this.jwtSecret) as any;
        console.log('[RolesGuard] Token decodificado:', decoded);
        
        user = {
          id: decoded.sub,
          email: decoded.email,
          role: decoded.role,
          allowedModules: decoded.allowedModules || [],
        };
        // Inyectar en request para otros guards
        request.user = user;
        
        console.log('[RolesGuard] Usuario inyectado:', user);
      } catch (error) {
        console.log('[RolesGuard] Error al verificar token:', error.message);
        throw new UnauthorizedException('Token inválido o expirado');
      }
    }

    console.log('[RolesGuard] Verificando rol:', user?.role);

    if (!user || !user.role) {
      console.log('[RolesGuard] ERROR: No se pudo verificar el rol');
      throw new ForbiddenException('No se pudo verificar el rol del usuario');
    }

    // SUPER_ADMIN siempre tiene acceso
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    // Verificar si el rol del usuario está en los roles requeridos
    const hasRole = requiredRoles.includes(user.role);
    
    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Se requiere uno de los siguientes roles: ${requiredRoles.join(', ')}`
      );
    }

    return true;
  }
}
