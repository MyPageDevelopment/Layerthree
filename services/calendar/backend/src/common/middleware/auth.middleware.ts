import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    // Rutas públicas que no requieren autenticación
    const publicRoutes = ['/health', '/'];
    if (publicRoutes.includes(req.path)) {
      return next();
    }

    const authHeader = req.headers.authorization;

    console.log('[AuthMiddleware] Ejecutándose para:', req.path);
    console.log('[AuthMiddleware] Authorization header:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[AuthMiddleware] No hay token o formato incorrecto');
      throw new UnauthorizedException('Token de autenticación no proporcionado');
    }

    const token = authHeader.substring(7);
    console.log('[AuthMiddleware] Token extraído:', token.substring(0, 50) + '...');

    try {
      // Validar token con el servicio de autenticación
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth_backend:3002';
      const url = `${authServiceUrl}/auth/validate`;
      console.log('[AuthMiddleware] Llamando a:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      console.log('[AuthMiddleware] Respuesta status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[AuthMiddleware] Error en validación:', errorText);
        throw new UnauthorizedException('Token inválido o expirado');
      }

      const user = await response.json();
      console.log('[AuthMiddleware] Usuario validado:', user);

      // Inyectar usuario en el request para que los guards puedan acceder
      (req as any).user = {
        id: user.id,
        email: user.email,
        role: user.role,
        allowedModules: user.allowedModules || [],
      };

      console.log('[AuthMiddleware] Usuario inyectado en request:', (req as any).user);

      next();
    } catch (error) {
      console.log('[AuthMiddleware] Error capturado:', error.message);
      throw new UnauthorizedException('Error al validar el token de autenticación');
    }
  }
}
