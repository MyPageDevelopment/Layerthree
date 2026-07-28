import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard para verificar que un TECNICO solo pueda acceder a tareas donde está asignado
 * Los roles JEFE, GERENTE y SUPER_ADMIN pueden acceder a cualquier tarea
 */
@Injectable()
export class TaskAssignmentGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const taskId = request.params.id || request.params.taskId;

    if (!user || !user.role) {
      throw new ForbiddenException('No se pudo verificar el usuario');
    }

    // SUPER_ADMIN, GERENTE y JEFE tienen acceso total
    if (['SUPER_ADMIN', 'GERENTE', 'JEFE'].includes(user.role)) {
      return true;
    }

    // TECNICO: verificar que esté asignado a la tarea
    if (user.role === 'TECNICO') {
      if (!taskId) {
        throw new ForbiddenException('ID de tarea no proporcionado');
      }

      const assignment = await this.prisma.taskAssignment.findFirst({
        where: {
          taskId: taskId,
          userId: user.id,
        },
      });

      if (!assignment) {
        throw new ForbiddenException('No tienes permiso para acceder a esta tarea');
      }

      return true;
    }

    return false;
  }
}
