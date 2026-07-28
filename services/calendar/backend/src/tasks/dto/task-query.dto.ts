import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { TaskStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class TaskQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'projectId debe ser un UUID válido' })
  projectId?: string;

  @IsOptional()
  @IsEnum(TaskStatus, { message: 'status debe ser un valor válido de TaskStatus' })
  status?: TaskStatus;

  @IsOptional()
  @IsUUID('4', { message: 'userId/assignedTo debe ser un UUID válido' })
  @Transform(({ value, obj }) => value || obj.assignedTo) // Soportar tanto userId como assignedTo
  userId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'assignedTo debe ser un UUID válido' })
  @Transform(({ value, obj }) => obj.userId || value) // Mapear assignedTo a userId
  assignedTo?: string;
}
