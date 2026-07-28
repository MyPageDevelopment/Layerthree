import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, Matches } from 'class-validator';

export class CreateShiftTypeDto {
  @ApiProperty({ example: 'NORMAL', description: 'Código único del tipo de jornada' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Jornada Normal', description: 'Nombre del tipo de jornada' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '#3B82F6', description: 'Color en formato hexadecimal #RRGGBB' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'El color debe estar en formato hexadecimal #RRGGBB' })
  color: string;

  @ApiProperty({ example: 'Jornada laboral estándar de lunes a viernes', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: true, default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
