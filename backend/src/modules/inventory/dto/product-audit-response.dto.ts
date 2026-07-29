import { Expose } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class ProductAuditResponseDto {
  @Expose()
  id: string;

  @Expose()
  productId: string;

  @Expose()
  productSku: string;

  @Expose()
  productName: string;

  @Expose()
  action: string;

  @Expose()
  userId: string;

  @Expose()
  userName: string;

  @Expose()
  userEmail: string;

  @Expose()
  userRole: UserRole;

  @Expose()
  changes: string;

  @Expose()
  ipAddress: string;

  @Expose()
  userAgent: string;

  @Expose()
  createdAt: Date;
}
