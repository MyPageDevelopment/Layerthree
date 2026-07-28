import { Module } from '@nestjs/common';
import { RecurrenceService } from './recurrence.service';
import { RecurrenceController } from './recurrence.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecurrenceController],
  providers: [RecurrenceService],
  exports: [RecurrenceService],
})
export class RecurrenceModule {}
