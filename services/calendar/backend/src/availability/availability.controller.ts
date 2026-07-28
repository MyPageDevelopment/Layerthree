import { Controller, Post, Get, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { FreeBusyStatus } from '@prisma/client';
import {
  CheckUserAvailabilityDto,
  CheckResourceAvailabilityDto,
  FindAvailableSlotsDto,
  CheckMultipleUsersDto,
} from './dto/check-availability.dto';

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post('check-user')
  @ApiOperation({ summary: 'Verificar disponibilidad de un usuario' })
  @ApiResponse({
    status: 200,
    description: 'Retorna si el usuario está disponible y lista de conflictos',
    schema: {
      example: {
        hasConflict: false,
        conflicts: [],
      },
    },
  })
  async checkUser(@Body() dto: CheckUserAvailabilityDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    return this.availabilityService.checkUserAvailability(
      dto.userId,
      startDate,
      endDate,
      dto.excludeTaskId,
    );
  }

  @Post('check-resource')
  @ApiOperation({ summary: 'Verificar disponibilidad de un recurso (equipo, sala, vehículo)' })
  @ApiResponse({
    status: 200,
    description: 'Retorna si el recurso está disponible',
    schema: {
      example: {
        hasConflict: true,
        conflicts: [
          {
            id: 'booking-id-123',
            description: 'Sala de Reuniones Principal',
            startDate: '2024-02-01T10:00:00.000Z',
            endDate: '2024-02-01T12:00:00.000Z',
          },
        ],
      },
    },
  })
  async checkResource(@Body() dto: CheckResourceAvailabilityDto) {
    const startDateTime = new Date(dto.startDateTime);
    const endDateTime = new Date(dto.endDateTime);

    return this.availabilityService.checkResourceAvailability(
      dto.resourceId,
      startDateTime,
      endDateTime,
    );
  }

  @Post('find-slots')
  @ApiOperation({ summary: 'Encontrar espacios disponibles de un usuario en un rango de fechas' })
  @ApiResponse({
    status: 200,
    description: 'Retorna lista de slots disponibles',
    schema: {
      example: [
        {
          startDate: '2024-02-01T08:00:00.000Z',
          endDate: '2024-02-01T10:00:00.000Z',
        },
        {
          startDate: '2024-02-01T14:00:00.000Z',
          endDate: '2024-02-01T16:00:00.000Z',
        },
      ],
    },
  })
  async findSlots(@Body() dto: FindAvailableSlotsDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    return this.availabilityService.findAvailableSlots(
      dto.userId,
      startDate,
      endDate,
      dto.durationHours,
    );
  }

  @Post('check-multiple-users')
  @ApiOperation({ summary: 'Verificar disponibilidad de múltiples usuarios (reuniones)' })
  @ApiResponse({
    status: 200,
    description: 'Retorna mapa de disponibilidad por usuario',
    schema: {
      example: {
        'user-id-1': {
          hasConflict: false,
          conflicts: [],
        },
        'user-id-2': {
          hasConflict: true,
          conflicts: [
            {
              id: 'task-id-789',
              description: 'Usuario tiene otra tarea asignada',
              startDate: '2024-02-01T14:00:00.000Z',
              endDate: '2024-02-01T16:00:00.000Z',
            },
          ],
        },
      },
    },
  })
  async checkMultipleUsers(@Body() dto: CheckMultipleUsersDto) {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    return this.availabilityService.checkMultipleUsersAvailability(
      dto.userIds,
      startDate,
      endDate,
    );
  }

  // ========================================================================
  // ENDPOINTS FREE/BUSY CORPORATIVOS
  // ========================================================================

  @Get('users/:userId/free-busy')
  @ApiOperation({ summary: 'Get Free/Busy calendar for a user' })
  async getUserFreeBusy(
    @Param('userId') userId: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.availabilityService.calculateUserFreeBusy(
      userId,
      new Date(start),
      new Date(end),
    );
  }

  @Get('teams/free-busy')
  @ApiOperation({ summary: 'Get Free/Busy for multiple users (team)' })
  async getTeamFreeBusy(
    @Query('userIds') userIds: string,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const userIdArray = userIds.split(',');
    return this.availabilityService.getTeamFreeBusy(
      userIdArray,
      new Date(start),
      new Date(end),
    );
  }

  @Get('teams/common-slots')
  @ApiOperation({ summary: 'Find common free slots for a team' })
  async findCommonFreeSlots(
    @Query('userIds') userIds: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('duration') duration: string,
  ) {
    const userIdArray = userIds.split(',');
    return this.availabilityService.findCommonFreeSlots(
      userIdArray,
      new Date(start),
      new Date(end),
      parseInt(duration),
    );
  }

  @Post('users/:userId/block-time')
  @ApiOperation({ summary: 'Block time manually for a user' })
  async blockUserTime(
    @Param('userId') userId: string,
    @Body() data: {
      startTime: string;
      endTime: string;
      status: FreeBusyStatus;
      description?: string;
    },
  ) {
    return this.availabilityService.blockUserTime(
      userId,
      new Date(data.startTime),
      new Date(data.endTime),
      data.status,
      data.description,
    );
  }
}
