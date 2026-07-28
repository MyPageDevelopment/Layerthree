import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ResourceAvailabilityResult {
  isAvailable: boolean;
  conflicts?: Array<{
    id: string;
    taskId: string;
    userId: string;
    userName: string;
    startTime: Date;
    endTime: Date;
    purpose?: string;
  }>;
}

export interface ResourceBookingInfo {
  id: string;
  resourceId: string;
  resourceName: string;
  taskId: string;
  userId: string;
  userName: string;
  startTime: Date;
  endTime: Date;
  purpose?: string;
  isConfirmed: boolean;
  isCancelled: boolean;
}

@Injectable()
export class ResourceBookingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verifica si un recurso está disponible en un rango de tiempo
   */
  async checkResourceAvailability(
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeBookingId?: string,
  ): Promise<ResourceAvailabilityResult> {
    // Validar que el recurso existe y está disponible
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    if (!resource.available) {
      return {
        isAvailable: false,
        conflicts: [
          {
            id: 'resource-unavailable',
            taskId: '',
            userId: '',
            userName: '',
            startTime: new Date(),
            endTime: new Date(),
            purpose: 'Resource is currently unavailable',
          },
        ],
      };
    }

    // Buscar conflictos en reservas confirmadas
    const conflicts = await this.prisma.resourceBooking.findMany({
      where: {
        resourceId,
        isCancelled: false,
        id: excludeBookingId ? { not: excludeBookingId } : undefined,
        OR: [
          // Nueva reserva empieza durante una reserva existente
          {
            AND: [
              { startTime: { lte: startTime } },
              { endTime: { gt: startTime } },
            ],
          },
          // Nueva reserva termina durante una reserva existente
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          // Nueva reserva engloba una reserva existente
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
      include: {
        user: true,
      },
    });

    if (conflicts.length > 0) {
      return {
        isAvailable: false,
        conflicts: conflicts.map((booking) => ({
          id: booking.id,
          taskId: booking.taskId,
          userId: booking.userId,
          userName: booking.user.name,
          startTime: booking.startTime,
          endTime: booking.endTime,
          purpose: booking.purpose || undefined,
        })),
      };
    }

    return { isAvailable: true };
  }

  /**
   * Reserva un recurso (con validación de conflictos)
   */
  async bookResource(
    resourceId: string,
    taskId: string,
    userId: string,
    startTime: Date,
    endTime: Date,
    purpose?: string,
    autoConfirm: boolean = false,
  ): Promise<ResourceBookingInfo> {
    // 1. Verificar disponibilidad
    const availability = await this.checkResourceAvailability(
      resourceId,
      startTime,
      endTime,
    );

    if (!availability.isAvailable) {
      throw new ConflictException(
        'Resource is not available at the requested time',
        JSON.stringify(availability.conflicts),
      );
    }

    // 2. Crear la reserva
    const booking = await this.prisma.resourceBooking.create({
      data: {
        resourceId,
        taskId,
        userId,
        startTime,
        endTime,
        purpose,
        isConfirmed: autoConfirm,
      },
      include: {
        resource: true,
        user: true,
      },
    });

    return {
      id: booking.id,
      resourceId: booking.resourceId,
      resourceName: booking.resource.name,
      taskId: booking.taskId,
      userId: booking.userId,
      userName: booking.user.name,
      startTime: booking.startTime,
      endTime: booking.endTime,
      purpose: booking.purpose || undefined,
      isConfirmed: booking.isConfirmed,
      isCancelled: booking.isCancelled,
    };
  }

  /**
   * Obtiene el calendario de un recurso (todas las reservas)
   */
  async getResourceCalendar(
    resourceId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ResourceBookingInfo[]> {
    const bookings = await this.prisma.resourceBooking.findMany({
      where: {
        resourceId,
        isCancelled: false,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      include: {
        resource: true,
        user: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return bookings.map((b) => ({
      id: b.id,
      resourceId: b.resourceId,
      resourceName: b.resource.name,
      taskId: b.taskId,
      userId: b.userId,
      userName: b.user.name,
      startTime: b.startTime,
      endTime: b.endTime,
      purpose: b.purpose || undefined,
      isConfirmed: b.isConfirmed,
      isCancelled: b.isCancelled,
    }));
  }

  /**
   * Confirma una reserva pendiente
   */
  async confirmBooking(bookingId: string, userId: string): Promise<void> {
    const booking = await this.prisma.resourceBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ConflictException('Only the booking owner can confirm it');
    }

    await this.prisma.resourceBooking.update({
      where: { id: bookingId },
      data: { isConfirmed: true },
    });
  }

  /**
   * Cancela una reserva
   */
  async cancelBooking(bookingId: string, userId: string): Promise<void> {
    const booking = await this.prisma.resourceBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ConflictException('Only the booking owner can cancel it');
    }

    await this.prisma.resourceBooking.update({
      where: { id: bookingId },
      data: { isCancelled: true },
    });
  }

  /**
   * Actualiza una reserva (con validación de conflictos)
   */
  async updateBooking(
    bookingId: string,
    userId: string,
    updates: Partial<{
      startTime: Date;
      endTime: Date;
      purpose: string;
    }>,
  ): Promise<ResourceBookingInfo> {
    const booking = await this.prisma.resourceBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.userId !== userId) {
      throw new ConflictException('Only the booking owner can update it');
    }

    // Si se cambian las fechas, validar disponibilidad
    if (updates.startTime || updates.endTime) {
      const newStart = updates.startTime || booking.startTime;
      const newEnd = updates.endTime || booking.endTime;

      const availability = await this.checkResourceAvailability(
        booking.resourceId,
        newStart,
        newEnd,
        bookingId, // Excluir esta reserva de la validación
      );

      if (!availability.isAvailable) {
        throw new ConflictException(
          'Resource is not available at the new time',
          JSON.stringify(availability.conflicts),
        );
      }
    }

    const updated = await this.prisma.resourceBooking.update({
      where: { id: bookingId },
      data: updates,
      include: {
        resource: true,
        user: true,
      },
    });

    return {
      id: updated.id,
      resourceId: updated.resourceId,
      resourceName: updated.resource.name,
      taskId: updated.taskId,
      userId: updated.userId,
      userName: updated.user.name,
      startTime: updated.startTime,
      endTime: updated.endTime,
      purpose: updated.purpose || undefined,
      isConfirmed: updated.isConfirmed,
      isCancelled: updated.isCancelled,
    };
  }

  /**
   * Obtiene todas las reservas de un usuario
   */
  async getUserBookings(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ResourceBookingInfo[]> {
    const bookings = await this.prisma.resourceBooking.findMany({
      where: {
        userId,
        isCancelled: false,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      include: {
        resource: true,
        user: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    });

    return bookings.map((b) => ({
      id: b.id,
      resourceId: b.resourceId,
      resourceName: b.resource.name,
      taskId: b.taskId,
      userId: b.userId,
      userName: b.user.name,
      startTime: b.startTime,
      endTime: b.endTime,
      purpose: b.purpose || undefined,
      isConfirmed: b.isConfirmed,
      isCancelled: b.isCancelled,
    }));
  }

  /**
   * Encuentra recursos disponibles de un tipo específico
   */
  async findAvailableResources(
    resourceType: string,
    startTime: Date,
    endTime: Date,
  ): Promise<any[]> {
    const resources = await this.prisma.resource.findMany({
      where: {
        type: resourceType as any,
        available: true,
      },
    });

    const available = [];

    for (const resource of resources) {
      const availability = await this.checkResourceAvailability(
        resource.id,
        startTime,
        endTime,
      );

      if (availability.isAvailable) {
        available.push(resource);
      }
    }

    return available;
  }
}
