import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsDateString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ArrayNotEmpty,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({ example: 'TASK-2024-001', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Implementar API de autenticación', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Desarrollar sistema JWT con refresh tokens' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.PENDING })
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @ApiProperty({ enum: TaskPriority, example: TaskPriority.HIGH })
  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @ApiProperty({ example: 'e4a2b1c3-5678-90ab-cdef-1234567890ab' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: '2024-02-01T08:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-02-15T17:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: 40, description: 'Horas estimadas de trabajo' })
  @IsNumber()
  @Min(0)
  estimatedHours: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({ example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab', description: 'ID de tarea padre' })
  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  @ApiPropertyOptional({ example: 'b2c3d4e5-6789-01bc-def0-234567890abc' })
  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @ApiPropertyOptional({ example: 'c3d4e5f6-789a-12cd-ef01-345678901bcd', description: 'ID del tipo de jornada' })
  @IsOptional()
  @IsUUID()
  shiftTypeId?: string;

  @ApiPropertyOptional({ example: '["dependency-task-id-1"]', description: 'Array de IDs de tareas dependientes como JSON' })
  @IsOptional()
  @IsString()
  dependencies?: string;

  @ApiPropertyOptional({ example: '{"phase": "development", "sprint": 5}' })
  @IsOptional()
  @IsString()
  metadata?: string;

  @ApiPropertyOptional({ 
    example: ['user-id-1', 'user-id-2'], 
    description: 'Array de IDs de usuarios a asignar como participantes' 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participantIds?: string[];

  @ApiPropertyOptional({ 
    example: true, 
    description: 'Si se debe enviar correo de notificación a los participantes asignados' 
  })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}
