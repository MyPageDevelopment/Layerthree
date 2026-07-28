import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductAuditService } from './product-audit.service';
import { ProductsController } from './products.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductAuditService],
})
export class ProductsModule {}
