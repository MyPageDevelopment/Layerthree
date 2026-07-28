import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import * as jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class JwtAuthGuard implements CanActivate {
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
    // Verificar si la ruta es pública
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticación no proporcionado');
    }

    const token = authHeader.substring(7);

    try {
      // Verificar y decodificar el JWT
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Inyectar usuario en el request
      request.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        allowedModules: decoded.allowedModules || [],
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
