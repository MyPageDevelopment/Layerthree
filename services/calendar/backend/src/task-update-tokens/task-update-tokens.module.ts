import { Module } from '@nestjs/common';
import { TaskUpdateTokenService } from './task-update-tokens.service';
import { TaskUpdateTokensController } from './task-update-tokens.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TaskUpdateTokensController],
  providers: [TaskUpdateTokenService],
  exports: [TaskUpdateTokenService],
})
export class TaskUpdateTokensModule {}
