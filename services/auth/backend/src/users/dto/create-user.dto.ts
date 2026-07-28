import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, IsArray } from 'class-validator';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  GERENTE = 'GERENTE',
  JEFE = 'JEFE',
  TECNICO = 'TECNICO',
}

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@ejemplo.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Juan Pérez', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: UserRole, default: UserRole.TECNICO })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ 
    example: ['inventory', 'projects'], 
    description: 'Módulos a los que el usuario tiene acceso',
    type: [String],
    required: false 
  })
  @IsArray()
  @IsOptional()
  allowedModules?: string[];
}
