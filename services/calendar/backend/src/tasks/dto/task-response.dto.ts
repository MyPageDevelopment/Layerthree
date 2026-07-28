import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { ProjectResponseDto } from '../../projects/dto/project-response.dto';
import { UserResponseDto } from '../../common/dto/user-response.dto';

/**
 * DTO de respuesta estandarizado para Task
 * Incluye todas las relaciones con UUIDs
 */
@Exclude()
export class TaskResponseDto {
  @Expose()
  @ApiProperty({ 
    example: 'd4e5f6a7-8901-23de-f012-45678901bcde',
    description: 'UUID de la tarea'
  })
  id: string;

  @Expose()
  @ApiProperty({ example: 'TASK-2025-001' })
  code: string;

  @Expose()
  @ApiProperty({ example: 'Implementar API de autenticación' })
  title: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Desarrollar sistema JWT con refresh tokens' })
  description?: string;

  @Expose()
  @ApiProperty({ 
    enum: ['PENDING', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'],
    example: 'IN_PROGRESS'
  })
  status: string;

  @Expose()
  @ApiProperty({ 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'HIGH'
  })
  priority: string;

  @Expose()
  @ApiProperty({ example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab' })
  projectId: string;

  @Expose()
  @ApiPropertyOptional({ example: '2024-02-01T08:00:00.000Z' })
  startDate?: Date;

  @Expose()
  @ApiPropertyOptional({ example: '2024-02-15T17:00:00.000Z' })
  endDate?: Date;

  @Expose()
  @ApiPropertyOptional({ example: '2024-02-10T17:00:00.000Z' })
  dueDate?: Date;

  @Expose()
  @ApiPropertyOptional({ example: '2024-02-09T16:30:00.000Z' })
  completedAt?: Date;

  @Expose()
  @ApiPropertyOptional({ example: 40 })
  estimatedHours?: number;

  @Expose()
  @ApiProperty({ example: 25.5 })
  actualHours: number;

  @Expose()
  @ApiProperty({ example: 65, minimum: 0, maximum: 100 })
  progress: number;

  @Expose()
  @ApiPropertyOptional({ example: 'e5f6a7b8-9012-34ef-0123-56789012cdef' })
  parentTaskId?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'f6a7b8c9-0123-45f0-1234-67890123def0' })
  milestoneId?: string;

  @Expose()
  @ApiPropertyOptional({ example: '["dependency-id-1", "dependency-id-2"]' })
  tags?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Nota de seguimiento importante' })
  notes?: string;

  @Expose()
  @ApiProperty({ example: '2024-01-20T10:00:00.000Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ example: '2024-02-05T14:30:00.000Z' })
  updatedAt: Date;

  @Expose()
  @ApiProperty({ 
    enum: ['FREE', 'BUSY', 'TENTATIVE', 'OUT_OF_OFFICE'],
    example: 'BUSY'
  })
  freeBusyStatus: string;

  @Expose()
  @ApiProperty({ example: false })
  isRecurring: boolean;

  @Expose()
  @ApiPropertyOptional({ example: 'Oficina Central - Sala 3' })
  location?: string;

  @Expose()
  @ApiProperty({ example: 'America/Santiago' })
  timezone: string;

  @Expose()
  @ApiProperty({ 
    enum: ['PUBLIC', 'PRIVATE', 'CONFIDENTIAL'],
    example: 'PUBLIC'
  })
  visibility: string;

  // Relaciones opcionales
  @Expose()
  @Type(() => ProjectResponseDto)
  @ApiPropertyOptional({ type: ProjectResponseDto })
  project?: ProjectResponseDto;

  @Expose()
  @Type(() => TaskResponseDto)
  @ApiPropertyOptional({ type: TaskResponseDto })
  parentTask?: TaskResponseDto;

  @Expose()
  @Type(() => TaskResponseDto)
  @ApiPropertyOptional({ type: () => [TaskResponseDto] })
  subtasks?: TaskResponseDto[];
}
