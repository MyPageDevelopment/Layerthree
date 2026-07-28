import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersService {
  private authServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // URL del servicio de autenticación
    this.authServiceUrl = this.configService.get('AUTH_SERVICE_URL') || 'http://auth_backend:3002';
  }

  async findAll() {
    try {
      // Intentar obtener usuarios del servicio de autenticación
      const response = await fetch(`${this.authServiceUrl}/users/list-all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const authUsers = await response.json();
        
        // Sincronizar usuarios locales con los del servicio de autenticación
        await this.syncUsersFromAuth(authUsers);
        
        // Retornar usuarios activos del servicio de autenticación
        return authUsers
          .filter((user: any) => user.isActive)
          .map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            active: user.isActive,
            department: null,
            position: null,
          }));
      }
    } catch (error) {
      console.error('Error fetching users from auth service:', error);
    }

    // Fallback: retornar usuarios locales si falla la comunicación con auth service
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        department: true,
        position: true,
      },
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Sincroniza usuarios del servicio de autenticación a la base de datos local
   */
  private async syncUsersFromAuth(authUsers: any[]): Promise<void> {
    try {
      for (const authUser of authUsers) {
        // Verificar si el usuario ya existe localmente
        const existingUser = await this.prisma.user.findUnique({
          where: { id: authUser.id },
        });

        if (existingUser) {
          // Actualizar usuario existente
          await this.prisma.user.update({
            where: { id: authUser.id },
            data: {
              name: authUser.name,
              email: authUser.email,
              role: authUser.role,
              isActive: authUser.isActive,
            },
          });
        } else {
          // Crear nuevo usuario con password dummy (la autenticación se hace en auth_backend)
          await this.prisma.user.create({
            data: {
              id: authUser.id,
              name: authUser.name,
              email: authUser.email,
              password: 'AUTH_SERVICE_MANAGED', // Password dummy - la autenticación real está en auth_backend
              role: authUser.role,
              isActive: authUser.isActive,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error syncing users:', error);
    }
  }
}
