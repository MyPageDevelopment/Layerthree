import { Exclude, Expose, Type } from 'class-transformer';
import { ProductResponseDto } from '../../products/dto/product-response.dto';

/**
 * DTO Usuario simplificado para Inventory Service
 * Sincronizado con Auth Service
 */
@Exclude()
export class UserResponseDto {
  @Expose()
  id: string;

  @Expose()
  email: string;

  @Expose()
  name: string;

  @Expose()
  role: string;

  @Expose()
  isActive: boolean;

  @Expose()
  allowedModules?: string;
}

/**
 * DTO de respuesta estandarizado para Movement (Inventory Service)
 */
@Exclude()
export class MovementResponseDto {
  @Expose()
  id: string;

  @Expose()
  productId: string;

  @Expose()
  projectId?: string;

  @Expose()
  type: string;

  @Expose()
  quantity: number;

  @Expose()
  notes?: string;

  @Expose()
  userId: string;

  @Expose()
  createdAt: Date;

  // Relaciones opcionales
  @Expose()
  @Type(() => ProductResponseDto)
  product?: ProductResponseDto;

  @Expose()
  @Type(() => UserResponseDto)
  user?: UserResponseDto;
}
