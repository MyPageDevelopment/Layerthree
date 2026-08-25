import { IsOptional, IsInt, Min, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class RemoveVanItemDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  returnToWarehouse?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
