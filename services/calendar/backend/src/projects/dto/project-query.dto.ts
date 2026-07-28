import { IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ProjectStatus } from '@prisma/client';

export class ProjectQueryDto {
  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'status debe ser un valor válido de ProjectStatus' })
  status?: ProjectStatus;

  @IsOptional()
  @IsUUID('4', { message: 'ownerId debe ser un UUID válido' })
  ownerId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'managerId debe ser un UUID válido' })
  managerId?: string;
}
