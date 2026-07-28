import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsOptional, IsArray, IsNumber, Min } from 'class-validator';

export class CheckUserAvailabilityDto {
  @ApiProperty({ example: 'user-id-123' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: '2024-02-01T08:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-02-01T17:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 'task-id-456', required: false, description: 'ID de tarea a excluir de la validación' })
  @IsOptional()
  @IsUUID()
  excludeTaskId?: string;
}

export class CheckResourceAvailabilityDto {
  @ApiProperty({ example: 'resource-id-789' })
  @IsUUID()
  resourceId: string;

  @ApiProperty({ example: '2024-02-01T08:00:00.000Z' })
  @IsDateString()
  startDateTime: string;

  @ApiProperty({ example: '2024-02-01T17:00:00.000Z' })
  @IsDateString()
  endDateTime: string;
}

export class FindAvailableSlotsDto {
  @ApiProperty({ example: 'user-id-123' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: '2024-02-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-02-07' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 2, description: 'Duración en horas' })
  @IsNumber()
  @Min(0.5)
  durationHours: number;
}

export class CheckMultipleUsersDto {
  @ApiProperty({ example: ['user-id-1', 'user-id-2', 'user-id-3'] })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiProperty({ example: '2024-02-01T14:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-02-01T16:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 'task-id-456', required: false })
  @IsOptional()
  @IsUUID()
  excludeTaskId?: string;
}
