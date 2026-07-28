import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar si la ruta es pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      console.log('[AuthGuard] Ruta pública, omitiendo validación');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    console.log('[AuthGuard] Ejecutándose...');
    console.log('[AuthGuard] Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[AuthGuard] No hay token o formato incorrecto');
      throw new UnauthorizedException('Token de autenticación no proporcionado');
    }

    const token = authHeader.substring(7);
    console.log('[AuthGuard] Token extraído:', token.substring(0, 50) + '...');

    try {
      // Validar token con el servicio de autenticación
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth_backend:3002';
      const url = `${authServiceUrl}/auth/validate`;
      console.log('[AuthGuard] Llamando a:', url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      console.log('[AuthGuard] Respuesta status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[AuthGuard] Error en validación:', errorText);
        throw new UnauthorizedException('Token inválido o expirado');
      }

      const user = await response.json();
      console.log('[AuthGuard] Usuario validado:', user);
      
      // Inyectar usuario en el request para que los guards puedan acceder
      request.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        allowedModules: user.allowedModules || [],
      };

      console.log('[AuthGuard] Usuario inyectado en request:', request.user);

      return true;
    } catch (error) {
      console.log('[AuthGuard] Error capturado:', error.message);
      throw new UnauthorizedException('Error al validar el token de autenticación');
    }
  }
}
