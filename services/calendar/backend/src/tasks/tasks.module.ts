import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { AvailabilityModule } from '../availability/availability.module';
import { TaskUpdateTokensModule } from '../task-update-tokens/task-update-tokens.module';

@Module({
  imports: [AvailabilityModule, TaskUpdateTokensModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
