import { IsString, IsOptional, IsInt, Min, IsEnum, IsUUID } from 'class-validator';
import { MovementType } from '@prisma/client';

export class CreateMovementDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsEnum(MovementType)
  type: MovementType;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  vanId?: string;
}
