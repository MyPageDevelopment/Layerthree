import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

/**
 * DTO de respuesta estandarizado para User
 * Garantiza que el frontend reciba la estructura correcta con UUIDs
 */
@Exclude()
export class UserResponseDto {
  @Expose()
  @ApiProperty({ 
    example: 'e4a2b1c3-5678-90ab-cdef-1234567890ab',
    description: 'UUID del usuario'
  })
  id: string;

  @Expose()
  @ApiProperty({ example: 'admin@empresa.com' })
  email: string;

  @Expose()
  @ApiProperty({ example: 'Juan Pérez' })
  name: string;

  @Expose()
  @ApiProperty({ 
    enum: ['SUPER_ADMIN', 'GERENTE', 'JEFE', 'TECNICO'],
    example: 'GERENTE'
  })
  role: string;

  @Expose()
  @ApiProperty({ example: true })
  isActive: boolean;

  @Expose()
  @ApiPropertyOptional({ 
    example: '["inventory", "calendar"]',
    description: 'JSON array de módulos permitidos'
  })
  allowedModules?: string;

  @Expose()
  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ example: '2024-01-16T14:20:00.000Z' })
  updatedAt: Date;
}
