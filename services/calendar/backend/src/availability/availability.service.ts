import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addMinutes, isBefore, isAfter, isWithinInterval, parseISO } from 'date-fns';
import { FreeBusyStatus } from '@prisma/client';

export interface TimeSlot {
  startDateTime: Date;
  endDateTime: Date;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts?: Array<{
    id: string;
    description: string;
    startDateTime: Date;
    endDateTime: Date;
  }>;
}

// Nuevas interfaces para Free/Busy
export interface FreeBusySlot {
  start: Date;
  end: Date;
  status: FreeBusyStatus;
  description?: string;
  taskId?: string;
}

export interface TeamAvailability {
  userId: string;
  userName: string;
  slots: FreeBusySlot[];
  availableSlots: { start: Date; end: Date }[];
}

/**
 * Servicio para validación de disponibilidad y prevención de conflictos
 * de programación (Double Booking Prevention)
 */
@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  /**
   * Valida si un usuario está disponible en un rango de fechas
   * Verifica:
   * - Asignaciones de tareas existentes
   * - Horario laboral del usuario
   * - Días festivos
   * - Otras reservas de recursos
   */
  async checkUserAvailability(
    userId: string,
    startDateTime: Date,
    endDateTime: Date,
    excludeTaskId?: string,
  ): Promise<ConflictResult> {
    // 1. Verificar que el rango de fechas es válido
    this.validateTimeSlot({ startDateTime, endDateTime });

    // 2. Verificar jornada laboral
    const workScheduleConflict = await this.checkWorkScheduleConflict(
      userId,
      startDateTime,
      endDateTime,
    );
    if (workScheduleConflict.hasConflict) {
      return workScheduleConflict;
    }

    // 3. Verificar días festivos
    const holidayConflict = await this.checkHolidayConflict(
      startDateTime,
      endDateTime,
    );
    if (holidayConflict.hasConflict) {
      return holidayConflict;
    }

    // 4. Verificar solapamiento con tareas asignadas
    const taskConflict = await this.checkTaskAssignmentConflict(
      userId,
      startDateTime,
      endDateTime,
      excludeTaskId,
    );
    if (taskConflict.hasConflict) {
      return taskConflict;
    }

    return { hasConflict: false };
  }

  /**
   * Valida si un recurso (equipo, sala, vehículo) está disponible
   */
  async checkResourceAvailability(
    resourceId: string,
    startDateTime: Date,
    endDateTime: Date,
    excludeScheduleId?: string,
  ): Promise<ConflictResult> {
    this.validateTimeSlot({ startDateTime, endDateTime });

    const conflicts = await this.prisma.resourceSchedule.findMany({
      where: {
        resourceId,
        id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
        AND: [
          {
            OR: [
              // El nuevo slot empieza durante una reserva existente
              {
                AND: [
                  { startDateTime: { lte: startDateTime } },
                  { endDateTime: { gt: startDateTime } },
                ],
              },
              // El nuevo slot termina durante una reserva existente
              {
                AND: [
                  { startDateTime: { lt: endDateTime } },
                  { endDateTime: { gte: endDateTime } },
                ],
              },
              // El nuevo slot engloba completamente una reserva existente
              {
                AND: [
                  { startDateTime: { gte: startDateTime } },
                  { endDateTime: { lte: endDateTime } },
                ],
              },
            ],
          },
        ],
      },
      include: {
        resource: true,
      },
    });

    if (conflicts.length > 0) {
      return {
        hasConflict: true,
        conflicts: conflicts.map((c) => ({
          id: c.id,
          description: `${c.resource.name} ya está reservado: ${c.purpose || 'Sin descripción'}`,
          startDateTime: c.startDateTime,
          endDateTime: c.endDateTime,
        })),
      };
    }

    return { hasConflict: false };
  }

  /**
   * Valida si hay solapamiento entre múltiples usuarios y un rango de fechas
   * Útil para reuniones o tareas grupales
   */
  async checkMultipleUsersAvailability(
    userIds: string[],
    startDateTime: Date,
    endDateTime: Date,
  ): Promise<{
    allAvailable: boolean;
    unavailableUsers: Array<{ userId: string; conflicts: ConflictResult }>;
  }> {
    const unavailableUsers: Array<{ userId: string; conflicts: ConflictResult }> = [];

    for (const userId of userIds) {
      const result = await this.checkUserAvailability(
        userId,
        startDateTime,
        endDateTime,
      );

      if (result.hasConflict) {
        unavailableUsers.push({ userId, conflicts: result });
      }
    }

    return {
      allAvailable: unavailableUsers.length === 0,
      unavailableUsers,
    };
  }

  /**
   * Encuentra slots de tiempo disponibles para un usuario en un rango de fechas
   */
  async findAvailableSlots(
    userId: string,
    startDate: Date,
    endDate: Date,
    slotDurationMinutes: number = 60,
  ): Promise<TimeSlot[]> {
    const availableSlots: TimeSlot[] = [];
    
    // Obtener todas las asignaciones del usuario en el rango
    const assignments = await this.prisma.taskAssignment.findMany({
      where: {
        userId,
        task: {
          OR: [
            {
              AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: startDate } },
              ],
            },
          ],
        },
      },
      include: {
        task: true,
      },
    });

    // Obtener horario laboral del usuario
    const workSchedules = await this.prisma.workSchedule.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    // Algoritmo de búsqueda de slots disponibles
    // (Simplificado - en producción se necesitaría más lógica)
    let currentSlot = startDate;
    while (isBefore(currentSlot, endDate)) {
      const slotEnd = addMinutes(currentSlot, slotDurationMinutes);
      
      const availability = await this.checkUserAvailability(
        userId,
        currentSlot,
        slotEnd,
      );

      if (!availability.hasConflict) {
        availableSlots.push({
          startDateTime: currentSlot,
          endDateTime: slotEnd,
        });
      }

      // Avanzar al siguiente slot (incrementar 30 minutos)
      currentSlot = addMinutes(currentSlot, 30);
    }

    return availableSlots;
  }

  // ========================================================================
  // MÉTODOS PRIVADOS DE VALIDACIÓN
  // ========================================================================

  /**
   * Valida que el rango de tiempo sea válido
   */
  private validateTimeSlot(slot: TimeSlot): void {
    if (isAfter(slot.startDateTime, slot.endDateTime)) {
      throw new ConflictException(
        'La fecha de inicio debe ser anterior a la fecha de fin',
      );
    }

    if (isBefore(slot.endDateTime, new Date())) {
      throw new ConflictException(
        'No se pueden crear asignaciones en el pasado',
      );
    }
  }

  /**
   * Verifica solapamiento con el horario laboral
   */
  private async checkWorkScheduleConflict(
    userId: string,
    startDateTime: Date,
    endDateTime: Date,
  ): Promise<ConflictResult> {
    const dayOfWeek = startDateTime.getDay();
    
    const workSchedule = await this.prisma.workSchedule.findFirst({
      where: {
        userId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!workSchedule) {
      return {
        hasConflict: true,
        conflicts: [
          {
            id: 'no-schedule',
            description: `El usuario no tiene horario laboral definido para este día`,
            startDateTime,
            endDateTime,
          },
        ],
      };
    }

    // Validar que esté dentro del horario laboral
    const [startHour, startMin] = workSchedule.startTime.split(':');
    const [endHour, endMin] = workSchedule.endTime.split(':');

    const scheduleStart = new Date(startDateTime);
    scheduleStart.setHours(parseInt(startHour), parseInt(startMin), 0, 0);

    const scheduleEnd = new Date(startDateTime);
    scheduleEnd.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

    const isOutsideSchedule =
      isBefore(startDateTime, scheduleStart) || isAfter(endDateTime, scheduleEnd);

    if (isOutsideSchedule) {
      return {
        hasConflict: true,
        conflicts: [
          {
            id: 'outside-work-hours',
            description: `Fuera del horario laboral (${workSchedule.startTime} - ${workSchedule.endTime})`,
            startDateTime: scheduleStart,
            endDateTime: scheduleEnd,
          },
        ],
      };
    }

    return { hasConflict: false };
  }

  /**
   * Verifica si el rango incluye días festivos
   */
  private async checkHolidayConflict(
    startDateTime: Date,
    endDateTime: Date,
  ): Promise<ConflictResult> {
    const holidays = await this.prisma.holiday.findMany({
      where: {
        date: {
          gte: startDateTime,
          lte: endDateTime,
        },
      },
    });

    if (holidays.length > 0) {
      return {
        hasConflict: true,
        conflicts: holidays.map((h) => ({
          id: h.id,
          description: `Día festivo: ${h.name}`,
          startDateTime: h.date,
          endDateTime: h.date,
        })),
      };
    }

    return { hasConflict: false };
  }

  /**
   * Verifica solapamiento con tareas ya asignadas al usuario
   */
  private async checkTaskAssignmentConflict(
    userId: string,
    startDateTime: Date,
    endDateTime: Date,
    excludeTaskId?: string,
  ): Promise<ConflictResult> {
    const overlappingTasks = await this.prisma.taskAssignment.findMany({
      where: {
        userId,
        task: {
          id: excludeTaskId ? { not: excludeTaskId } : undefined,
          status: {
            in: ['PENDING', 'IN_PROGRESS'], // Solo tareas activas
          },
          AND: [
            {
              OR: [
                // Tarea existente que se solapa con el nuevo rango
                {
                  AND: [
                    { startDate: { lte: startDateTime } },
                    { endDate: { gte: startDateTime } },
                  ],
                },
                {
                  AND: [
                    { startDate: { lte: endDateTime } },
                    { endDate: { gte: endDateTime } },
                  ],
                },
                {
                  AND: [
                    { startDate: { gte: startDateTime } },
                    { endDate: { lte: endDateTime } },
                  ],
                },
              ],
            },
          ],
        },
      },
      include: {
        task: {
          include: {
            project: true,
          },
        },
      },
    });

    if (overlappingTasks.length > 0) {
      return {
        hasConflict: true,
        conflicts: overlappingTasks.map((assignment) => ({
          id: assignment.task.id,
          description: `Tarea "${assignment.task.title}" del proyecto "${assignment.task.project.name}"`,
          startDateTime: assignment.task.startDate!,
          endDateTime: assignment.task.endDate!,
        })),
      };
    }

    return { hasConflict: false };
  }

  /**
   * Calcula horas efectivas considerando horario laboral y días festivos
   */
  async calculateEffectiveHours(
    userId: string,
    startDateTime: Date,
    endDateTime: Date,
  ): Promise<number> {
    // Implementación simplificada
    // En producción debería considerar:
    // - Horario laboral exacto
    // - Días festivos
    // - Fines de semana
    // - Tiempo de descanso
    
    const diffMs = endDateTime.getTime() - startDateTime.getTime();
    const totalHours = diffMs / (1000 * 60 * 60);
    
    // Asumiendo jornada de 8 horas diarias
    const workingDays = Math.ceil(totalHours / 24);
    const effectiveHours = workingDays * 8;
    
    return Math.min(effectiveHours, totalHours);
  }

  // ========================================================================
  // FUNCIONALIDADES FREE/BUSY CORPORATIVAS
  // ========================================================================

  /**
   * Calcula la disponibilidad Free/Busy de un usuario
   */
  async calculateUserFreeBusy(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FreeBusySlot[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        assignments: {
          some: { userId },
        },
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { dueDate: { gte: startDate } },
            ],
          },
        ],
      },
    });

    const manualBlocks = await this.prisma.userAvailability.findMany({
      where: {
        userId,
        startTime: { lte: endDate },
        endTime: { gte: startDate },
      },
    });

    const slots: FreeBusySlot[] = [];

    for (const task of tasks) {
      if (task.startDate && task.dueDate) {
        slots.push({
          start: task.startDate,
          end: task.dueDate,
          status: task.freeBusyStatus,
          description: task.title,
          taskId: task.id,
        });
      }
    }

    for (const block of manualBlocks) {
      slots.push({
        start: block.startTime,
        end: block.endTime,
        status: block.status,
        description: block.description || undefined,
        taskId: block.taskId || undefined,
      });
    }

    return slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * Encuentra slots comunes libres para múltiples usuarios
   */
  async findCommonFreeSlots(
    userIds: string[],
    startDate: Date,
    endDate: Date,
    durationMinutes: number,
  ): Promise<{ start: Date; end: Date }[]> {
    if (userIds.length === 0) return [];

    const allFreeSlots = await Promise.all(
      userIds.map((userId) =>
        this.getUserFreeSlots(userId, startDate, endDate, durationMinutes),
      ),
    );

    let commonSlots = allFreeSlots[0];

    for (let i = 1; i < allFreeSlots.length; i++) {
      commonSlots = this.intersectSlots(commonSlots, allFreeSlots[i]);
    }

    return commonSlots.filter((slot) => {
      const duration = (slot.end.getTime() - slot.start.getTime()) / 60000;
      return duration >= durationMinutes;
    });
  }

  /**
   * Obtiene disponibilidad de un equipo completo
   */
  async getTeamFreeBusy(
    userIds: string[],
    startDate: Date,
    endDate: Date,
  ): Promise<TeamAvailability[]> {
    const results: TeamAvailability[] = [];

    for (const userId of userIds) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) continue;

      const slots = await this.calculateUserFreeBusy(userId, startDate, endDate);
      const availableSlots = await this.getUserFreeSlots(
        userId,
        startDate,
        endDate,
        30,
      );

      results.push({
        userId: user.id,
        userName: user.name,
        slots,
        availableSlots,
      });
    }

    return results;
  }

  /**
   * Obtiene slots libres de un usuario
   */
  private async getUserFreeSlots(
    userId: string,
    startDate: Date,
    endDate: Date,
    durationMinutes: number,
  ): Promise<{ start: Date; end: Date }[]> {
    const busySlots = await this.calculateUserFreeBusy(userId, startDate, endDate);
    const blocked = busySlots.filter(
      (slot) =>
        slot.status === FreeBusyStatus.BUSY ||
        slot.status === FreeBusyStatus.OUT_OF_OFFICE,
    );

    const freeSlots: { start: Date; end: Date }[] = [];
    let currentStart = startDate;

    for (const busy of blocked) {
      if (currentStart < busy.start) {
        const gap = (busy.start.getTime() - currentStart.getTime()) / 60000;
        if (gap >= durationMinutes) {
          freeSlots.push({ start: currentStart, end: busy.start });
        }
      }
      currentStart = busy.end > currentStart ? busy.end : currentStart;
    }

    if (currentStart < endDate) {
      const gap = (endDate.getTime() - currentStart.getTime()) / 60000;
      if (gap >= durationMinutes) {
        freeSlots.push({ start: currentStart, end: endDate });
      }
    }

    return freeSlots;
  }

  /**
   * Calcula intersección de slots
   */
  private intersectSlots(
    slots1: { start: Date; end: Date }[],
    slots2: { start: Date; end: Date }[],
  ): { start: Date; end: Date }[] {
    const intersections: { start: Date; end: Date }[] = [];

    for (const slot1 of slots1) {
      for (const slot2 of slots2) {
        const start = new Date(
          Math.max(slot1.start.getTime(), slot2.start.getTime()),
        );
        const end = new Date(
          Math.min(slot1.end.getTime(), slot2.end.getTime()),
        );

        if (start < end) {
          intersections.push({ start, end });
        }
      }
    }

    return intersections;
  }

  /**
   * Bloquea tiempo manualmente para un usuario
   */
  async blockUserTime(
    userId: string,
    startTime: Date,
    endTime: Date,
    status: FreeBusyStatus,
    description?: string,
  ) {
    return this.prisma.userAvailability.create({
      data: {
        userId,
        startTime,
        endTime,
        status,
        description,
        isManual: true,
      },
    });
  }
}
