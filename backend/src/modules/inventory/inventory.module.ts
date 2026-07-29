import { Module } from '@nestjs/common';
import { ProductsController } from './controllers/products.controller';
import { MovementsController } from './controllers/movements.controller';
import { ReportsController } from './controllers/reports.controller';
import { ProductsService } from './services/products.service';
import { MovementsService } from './services/movements.service';
import { ReportsService } from './services/reports.service';
import { ProductAuditService } from './services/product-audit.service';

@Module({
  controllers: [
    ProductsController,
    MovementsController,
    ReportsController,
  ],
  providers: [
    ProductsService,
    MovementsService,
    ReportsService,
    ProductAuditService,
  ],
  exports: [
    ProductsService,
    MovementsService,
    ReportsService,
    ProductAuditService,
  ],
})
export class InventoryModule {}
