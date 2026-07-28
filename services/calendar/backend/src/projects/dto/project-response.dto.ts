import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';
import { UserResponseDto } from '../../common/dto/user-response.dto';

/**
 * DTO de respuesta estandarizado para Project
 * Garantiza UUIDs en todos los campos de ID
 */
@Exclude()
export class ProjectResponseDto {
  @Expose()
  @ApiProperty({ 
    example: 'a1b2c3d4-5678-90ab-cdef-1234567890ab',
    description: 'UUID del proyecto'
  })
  id: string;

  @Expose()
  @ApiProperty({ example: 'PRJ-2025-001' })
  code: string;

  @Expose()
  @ApiProperty({ example: 'Implementación Fibra Óptica Sector Norte' })
  name: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Despliegue de infraestructura FTTH' })
  description?: string;

  @Expose()
  @ApiProperty({ 
    enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'],
    example: 'ACTIVE'
  })
  status: string;

  @Expose()
  @ApiProperty({ 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    example: 'HIGH'
  })
  priority: string;

  @Expose()
  @ApiPropertyOptional({ example: '2025-01-15T09:00:00.000Z' })
  startDate?: Date;

  @Expose()
  @ApiPropertyOptional({ example: '2025-06-30T18:00:00.000Z' })
  endDate?: Date;

  @Expose()
  @ApiPropertyOptional({ example: 50000000 })
  budget?: number;

  @Expose()
  @ApiPropertyOptional({ example: 500 })
  estimatedHours?: number;

  @Expose()
  @ApiProperty({ example: 120.5 })
  actualHours: number;

  @Expose()
  @ApiProperty({ example: 'b2c3d4e5-6789-01bc-def0-234567890abc' })
  ownerId: string;

  @Expose()
  @ApiPropertyOptional({ example: 'c3d4e5f6-7890-12cd-ef01-34567890abcd' })
  managerId?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Empresa Telecomunicaciones XYZ' })
  clientName?: string;

  @Expose()
  @ApiPropertyOptional({ example: 'Región Metropolitana' })
  location?: string;

  @Expose()
  @ApiPropertyOptional({ example: '["fibra-optica", "infraestructura"]' })
  tags?: string;

  @Expose()
  @ApiProperty({ example: '2024-12-01T08:00:00.000Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ example: '2025-01-02T15:30:00.000Z' })
  updatedAt: Date;

  // Relaciones opcionales
  @Expose()
  @Type(() => UserResponseDto)
  @ApiPropertyOptional({ type: UserResponseDto })
  owner?: UserResponseDto;

  @Expose()
  @Type(() => UserResponseDto)
  @ApiPropertyOptional({ type: UserResponseDto })
  manager?: UserResponseDto;
}
