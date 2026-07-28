import { Exclude, Expose } from 'class-transformer';

/**
 * DTO de respuesta estandarizado para Product (Inventory Service)
 */
@Exclude()
export class ProductResponseDto {
  @Expose()
  id: string;

  @Expose()
  sku: string;

  @Expose()
  name: string;

  @Expose()
  description?: string;

  @Expose()
  category: string;

  @Expose()
  subcategory?: string;

  @Expose()
  stock: number;

  @Expose()
  minStock: number;

  @Expose()
  unitPrice: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
