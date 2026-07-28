import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TaskUpdateTokenService {
  constructor(private prisma: PrismaService) {}

  /**
   * Genera un token único de 64 caracteres
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Crea un token de actualización para un participante de tarea
   * @param taskId ID de la tarea
   * @param userId ID del usuario participante
   * @param expirationDays Días hasta que expire el token (default: 30)
   */
  async createToken(taskId: string, userId: string, expirationDays: number = 30) {
    // Verificar que la tarea existe
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Tarea con ID ${taskId} no encontrada`);
    }

    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Verificar que el usuario es participante de la tarea
    const assignment = await this.prisma.taskAssignment.findFirst({
      where: {
        taskId,
        userId,
      },
    });

    if (!assignment) {
      throw new BadRequestException(`El usuario no es participante de esta tarea`);
    }

    // Calcular fecha de expiración
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expirationDays);

    // Crear el token
    const token = this.generateToken();

    return this.prisma.taskUpdateToken.create({
      data: {
        taskId,
        userId,
        token,
        expiresAt,
      },
      include: {
        task: {
          include: {
            project: true,
          },
        },
        user: true,
      },
    });
  }

  /**
   * Valida un token y devuelve información de la tarea
   * @param token Token a validar
   */
  async validateToken(token: string) {
    const updateToken = await this.prisma.taskUpdateToken.findUnique({
      where: { token },
      include: {
        task: {
          include: {
            project: true,
            assignments: {
              include: {
                user: true,
              },
            },
          },
        },
        user: true,
      },
    });

    if (!updateToken) {
      throw new NotFoundException('Token no válido');
    }

    if (updateToken.used) {
      throw new BadRequestException('Este token ya fue utilizado');
    }

    if (new Date() > updateToken.expiresAt) {
      throw new BadRequestException('Este token ha expirado');
    }

    return updateToken;
  }

  /**
   * Actualiza el estado de una tarea usando el token
   * @param token Token de actualización
   * @param status Nuevo estado
   * @param notes Notas opcionales
   */
  async updateTaskStatus(token: string, status: string, notes?: string) {
    // Validar token
    const updateToken = await this.validateToken(token);

    // Validar que el status es válido
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException(`Estado inválido: ${status}`);
    }

    // Actualizar la tarea
    const updatedTask = await this.prisma.task.update({
      where: { id: updateToken.taskId },
      data: {
        status: status as any, // Cast to TaskStatus enum
        ...(notes && {
          notes: updateToken.task.notes
            ? `${updateToken.task.notes}\n\n[${new Date().toISOString()}] ${updateToken.user.name}: ${notes}`
            : `[${new Date().toISOString()}] ${updateToken.user.name}: ${notes}`,
        }),
        ...(status === 'COMPLETED' && { completedAt: new Date(), progress: 100 }),
        ...(status === 'IN_PROGRESS' && updateToken.task.progress === 0 && { progress: 25 }),
      },
      include: {
        project: true,
        assignments: {
          include: {
            user: true,
          },
        },
      },
    });

    // Marcar el token como usado
    await this.prisma.taskUpdateToken.update({
      where: { id: updateToken.id },
      data: {
        used: true,
        usedAt: new Date(),
      },
    });

    return updatedTask;
  }

  /**
   * Obtiene todos los tokens activos de una tarea
   * @param taskId ID de la tarea
   */
  async getTaskTokens(taskId: string) {
    return this.prisma.taskUpdateToken.findMany({
      where: {
        taskId,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Limpia tokens expirados (ejecutar periódicamente con cron)
   */
  async cleanupExpiredTokens() {
    const result = await this.prisma.taskUpdateToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return { deleted: result.count };
  }
}
