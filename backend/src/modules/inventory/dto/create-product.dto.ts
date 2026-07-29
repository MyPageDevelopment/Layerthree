import { IsString, IsOptional, IsInt, Min, IsNumber, IsEnum } from 'class-validator';
import { ProductCategory } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsInt()
  @Min(0)
  stock: number;

  @IsInt()
  @Min(0)
  minStock: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;
}
