import { IsUUID } from 'class-validator';

/**
 * DTO genérico para validar parámetros UUID en rutas
 * Uso: @Param(new ValidationPipe()) params: UuidParamDto
 */
export class UuidParamDto {
  @IsUUID('4', { message: 'El ID debe ser un UUID v4 válido' })
  id: string;
}

/**
 * DTO para validar userId en parámetros
 */
export class UserIdParamDto {
  @IsUUID('4', { message: 'userId debe ser un UUID v4 válido' })
  userId: string;
}

/**
 * DTO para validar projectId en parámetros
 */
export class ProjectIdParamDto {
  @IsUUID('4', { message: 'projectId debe ser un UUID v4 válido' })
  projectId: string;
}

/**
 * DTO para validar taskId en parámetros
 */
export class TaskIdParamDto {
  @IsUUID('4', { message: 'taskId debe ser un UUID v4 válido' })
  taskId: string;
}
