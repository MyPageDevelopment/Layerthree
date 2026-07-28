import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray, IsDateString, IsEnum, IsOptional, IsNumber, Min } from 'class-validator';

export enum AssignmentRole {
  RESPONSIBLE = 'RESPONSIBLE',
  COLLABORATOR = 'COLLABORATOR',
  REVIEWER = 'REVIEWER',
}

export class AssignUserDto {
  @ApiProperty({ example: ['user-id-1', 'user-id-2'], description: 'IDs de usuarios a asignar' })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds: string[];

  @ApiProperty({ enum: AssignmentRole, example: AssignmentRole.RESPONSIBLE })
  @IsEnum(AssignmentRole)
  role: AssignmentRole;

  @ApiProperty({ example: 20, description: 'Horas asignadas por usuario' })
  @IsNumber()
  @Min(0)
  allocatedHours: number;

  @ApiProperty({ example: '2024-02-01T08:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-02-15T17:00:00.000Z' })
  @IsDateString()
  endDate: string;
}
