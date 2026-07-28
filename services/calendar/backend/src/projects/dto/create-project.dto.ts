import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, TaskPriority } from '@prisma/client';

export class CreateProjectDto {
  @ApiProperty({ example: 'PRJ-2025-001' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Implementación Fibra Óptica Sector Norte' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ProjectStatus, default: 'PLANNING' })
  @IsEnum(ProjectStatus)
  status: ProjectStatus;

  @ApiProperty({ enum: TaskPriority, default: 'MEDIUM' })
  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @ApiPropertyOptional({ example: '2025-01-15T09:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-06-30T18:00:00Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 50000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiProperty()
  @IsUUID()
  ownerId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional({ example: 'Empresa Telecomunicaciones XYZ' })
  @IsOptional()
  @IsString()
  clientName?: string;

  @ApiPropertyOptional({ example: 'Región Metropolitana' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ example: '["fibra-optica", "infraestructura"]' })
  @IsOptional()
  @IsString()
  tags?: string;
}
