import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendeeStatus } from '@prisma/client';

export interface AttendeeInfo {
  id: string;
  userId: string;
  userName: string;
  email: string;
  status: AttendeeStatus;
  isOrganizer: boolean;
  isRequired: boolean;
  respondedAt?: Date;
  comment?: string;
}

export interface InvitationResponse {
  attendanceId: string;
  status: AttendeeStatus;
  comment?: string;
}

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea invitaciones para un evento/tarea
   */
  async createInvitations(
    taskId: string,
    userIds: string[],
    organizerId: string,
  ): Promise<AttendeeInfo[]> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const attendances = [];

    for (const userId of userIds) {
      const isOrganizer = userId === organizerId;

      const attendance = await this.prisma.attendance.create({
        data: {
          taskId,
          userId,
          status: isOrganizer ? AttendeeStatus.ACCEPTED : AttendeeStatus.PENDING,
          isOrganizer,
          isRequired: true,
        },
        include: {
          user: true,
        },
      });

      attendances.push({
        id: attendance.id,
        userId: attendance.userId,
        userName: attendance.user.name,
        email: attendance.user.email,
        status: attendance.status,
        isOrganizer: attendance.isOrganizer,
        isRequired: attendance.isRequired,
        respondedAt: attendance.respondedAt || undefined,
        comment: attendance.comment || undefined,
      });
    }

    return attendances;
  }

  /**
   * Responder a una invitación (Accept/Decline/Tentative)
   */
  async respondToInvitation(
    attendanceId: string,
    userId: string,
    status: AttendeeStatus,
    comment?: string,
  ): Promise<InvitationResponse> {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Invitation not found');
    }

    if (attendance.userId !== userId) {
      throw new BadRequestException('You cannot respond to this invitation');
    }

    if (attendance.isOrganizer && status === AttendeeStatus.DECLINED) {
      throw new BadRequestException('Organizer cannot decline their own event');
    }

    const updated = await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status,
        comment,
        respondedAt: new Date(),
      },
    });

    return {
      attendanceId: updated.id,
      status: updated.status,
      comment: updated.comment || undefined,
    };
  }

  /**
   * Obtiene el estado de asistencia para un evento
   */
  async getEventAttendance(taskId: string): Promise<AttendeeInfo[]> {
    const attendances = await this.prisma.attendance.findMany({
      where: { taskId },
      include: {
        user: true,
      },
      orderBy: [
        { isOrganizer: 'desc' },
        { isRequired: 'desc' },
        { user: { name: 'asc' } },
      ],
    });

    return attendances.map((a) => ({
      id: a.id,
      userId: a.userId,
      userName: a.user.name,
      email: a.user.email,
      status: a.status,
      isOrganizer: a.isOrganizer,
      isRequired: a.isRequired,
      respondedAt: a.respondedAt || undefined,
      comment: a.comment || undefined,
    }));
  }

  /**
   * Obtiene todas las invitaciones pendientes de un usuario
   */
  async getUserPendingInvitations(userId: string): Promise<any[]> {
    const invitations = await this.prisma.attendance.findMany({
      where: {
        userId,
        status: AttendeeStatus.PENDING,
      },
      include: {
        task: {
          include: {
            project: true,
          },
        },
      },
      orderBy: {
        task: {
          startDate: 'asc',
        },
      },
    });

    return invitations.map((inv) => ({
      attendanceId: inv.id,
      taskId: inv.taskId,
      taskTitle: inv.task.title,
      taskDescription: inv.task.description,
      projectName: inv.task.project.name,
      startDate: inv.task.startDate,
      dueDate: inv.task.dueDate,
      location: inv.task.location,
      isRequired: inv.isRequired,
      createdAt: inv.createdAt,
    }));
  }

  /**
   * Actualiza el estado de una invitación (para organizadores)
   */
  async updateInvitation(
    attendanceId: string,
    organizerId: string,
    updates: Partial<{
      isRequired: boolean;
      status: AttendeeStatus;
    }>,
  ): Promise<void> {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        task: true,
      },
    });

    if (!attendance) {
      throw new NotFoundException('Invitation not found');
    }

    // Verificar que quien actualiza sea el organizador
    const organizerAttendance = await this.prisma.attendance.findFirst({
      where: {
        taskId: attendance.taskId,
        userId: organizerId,
        isOrganizer: true,
      },
    });

    if (!organizerAttendance) {
      throw new BadRequestException('Only organizer can update invitations');
    }

    await this.prisma.attendance.update({
      where: { id: attendanceId },
      data: updates,
    });
  }

  /**
   * Elimina una invitación
   */
  async removeInvitation(
    attendanceId: string,
    organizerId: string,
  ): Promise<void> {
    const attendance = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!attendance) {
      throw new NotFoundException('Invitation not found');
    }

    // Verificar permisos
    const organizerAttendance = await this.prisma.attendance.findFirst({
      where: {
        taskId: attendance.taskId,
        userId: organizerId,
        isOrganizer: true,
      },
    });

    if (!organizerAttendance) {
      throw new BadRequestException('Only organizer can remove invitations');
    }

    if (attendance.isOrganizer) {
      throw new BadRequestException('Cannot remove organizer from event');
    }

    await this.prisma.attendance.delete({
      where: { id: attendanceId },
    });
  }

  /**
   * Obtiene estadísticas de respuestas para un evento
   */
  async getEventStats(taskId: string) {
    const attendances = await this.prisma.attendance.findMany({
      where: { taskId },
    });

    const stats = {
      total: attendances.length,
      accepted: attendances.filter((a) => a.status === AttendeeStatus.ACCEPTED).length,
      declined: attendances.filter((a) => a.status === AttendeeStatus.DECLINED).length,
      tentative: attendances.filter((a) => a.status === AttendeeStatus.TENTATIVE).length,
      pending: attendances.filter((a) => a.status === AttendeeStatus.PENDING).length,
    };

    return stats;
  }

  /**
   * Notifica a todos los invitados sobre un evento
   */
  async notifyAttendees(taskId: string, message: string): Promise<void> {
    const attendances = await this.prisma.attendance.findMany({
      where: { taskId, notified: false },
      include: {
        user: true,
        task: true,
      },
    });

    // Aquí iría la lógica de envío de notificaciones
    // Por ahora solo marcamos como notificados
    for (const attendance of attendances) {
      await this.prisma.attendance.update({
        where: { id: attendance.id },
        data: { notified: true },
      });

      // Crear notificación en sistema
      await this.prisma.notification.create({
        data: {
          userId: attendance.userId,
          type: 'EVENT_INVITATION',
          title: `Invitación: ${attendance.task.title}`,
          message,
        },
      });
    }
  }
}
