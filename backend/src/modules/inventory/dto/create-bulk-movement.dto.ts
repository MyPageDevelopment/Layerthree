import { IsString, IsOptional, IsInt, Min, IsEnum, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MovementType } from '@prisma/client';

export class MovementItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateBulkMovementDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MovementItemDto)
  items: MovementItemDto[];

  @IsString()
  projectId: string;

  @IsEnum(MovementType)
  type: MovementType;

  @IsOptional()
  @IsString()
  notes?: string;
}
