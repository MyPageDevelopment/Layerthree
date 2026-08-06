import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class AddVanItemDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre del ítem es requerido' })
  name: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  type?: string; // MATERIAL, HERRAMIENTA

  @IsInt()
  @Min(0)
  quantity: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  minQuantity?: number;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsOptional()
  deductFromWarehouse?: boolean;
}
