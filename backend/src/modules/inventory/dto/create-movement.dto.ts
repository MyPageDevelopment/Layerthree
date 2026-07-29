import { IsString, IsOptional, IsInt, Min, IsEnum, IsUUID } from 'class-validator';
import { MovementType } from '@prisma/client';

export class CreateMovementDto {
  @IsUUID()
  productId: string;

  @IsString()
  projectId: string;

  @IsEnum(MovementType)
  type: MovementType;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
