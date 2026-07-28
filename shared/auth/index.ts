/**
 * MIDDLEWARE DE AUTENTICACIÓN COMPARTIDO
 * Utilizado por todos los microservicios para validar JWT
 */

import * as jwt from 'jsonwebtoken'
import { User, UserRole } from '@intranet/shared-types'

export interface JwtPayload {
  sub: string // userId
  email: string
  role: UserRole
  iat?: number
  exp?: number
}

export class AuthService {
  private readonly secret: string
  private readonly expiresIn: string

  constructor(secret?: string, expiresIn: string = '7d') {
    this.secret = secret || process.env.JWT_SECRET || 'default-secret-change-in-production'
    this.expiresIn = expiresIn
  }

  /**
   * Generar un token JWT
   */
  generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role
    }

    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn
    })
  }

  /**
   * Verificar y decodificar un token JWT
   */
  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.secret) as JwtPayload
    } catch (error) {
      throw new Error('Token inválido o expirado')
    }
  }

  /**
   * Extraer token del header Authorization
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null
    
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null
    }
    
    return parts[1]
  }

  /**
   * Verificar si un usuario tiene un rol específico
   */
  hasRole(user: JwtPayload | User, requiredRole: UserRole): boolean {
    return user.role === requiredRole
  }

  /**
   * Verificar si un usuario tiene uno de varios roles
   */
  hasAnyRole(user: JwtPayload | User, requiredRoles: UserRole[]): boolean {
    return requiredRoles.includes(user.role)
  }

  /**
   * Verificar si es admin
   */
  isAdmin(user: JwtPayload | User): boolean {
    return user.role === UserRole.ADMIN
  }
}

/**
 * Instancia global del servicio de autenticación
 */
export const authService = new AuthService()

/**
 * Middleware Express para validar JWT
 */
export function jwtMiddleware(req: any, res: any, next: any) {
  try {
    const token = authService.extractTokenFromHeader(req.headers.authorization)
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No se proporcionó token de autenticación'
      })
    }

    const payload = authService.verifyToken(token)
    req.user = payload
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Token inválido o expirado'
    })
  }
}

/**
 * Middleware Express para verificar roles
 */
export function rolesMiddleware(...allowedRoles: UserRole[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      })
    }

    if (!authService.hasAnyRole(req.user, allowedRoles)) {
      return res.status(403).json({
        success: false,
        error: 'No tiene permisos para esta acción'
      })
    }

    next()
  }
}

export default AuthService
