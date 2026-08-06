import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';
import { ExcelParserService } from './excel-parser.service';

@Module({
  controllers: [RequestsController],
  providers: [RequestsService, ExcelParserService],
  exports: [RequestsService, ExcelParserService],
})
export class RequestsModule {}
