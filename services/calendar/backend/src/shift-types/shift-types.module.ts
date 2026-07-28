import { Module } from '@nestjs/common';
import { ShiftTypesService } from './shift-types.service';
import { ShiftTypesController } from './shift-types.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShiftTypesController],
  providers: [ShiftTypesService],
  exports: [ShiftTypesService],
})
export class ShiftTypesModule {}
