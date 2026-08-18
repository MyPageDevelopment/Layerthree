import { Module } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { InvoiceParserService } from './invoice-parser.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RequestsModule } from '../requests/requests.module';

@Module({
  imports: [PrismaModule, RequestsModule],
  controllers: [QuotationsController],
  providers: [QuotationsService, InvoiceParserService],
  exports: [QuotationsService, InvoiceParserService],
})
export class QuotationsModule {}
