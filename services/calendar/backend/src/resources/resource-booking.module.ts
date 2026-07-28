import { Module } from '@nestjs/common';
import { ResourceBookingService } from './resource-booking.service';
import { ResourceBookingController } from './resource-booking.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResourceBookingController],
  providers: [ResourceBookingService],
  exports: [ResourceBookingService],
})
export class ResourceBookingModule {}
