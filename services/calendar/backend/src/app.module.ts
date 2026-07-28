import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_PIPE, APP_GUARD } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

// Módulos
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { AvailabilityModule } from './availability/availability.module';
import { RecurrenceModule } from './recurrence/recurrence.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ResourceBookingModule } from './resources/resource-booking.module';
import { UsersModule } from './users/users.module';
import { EmailModule } from './emails/email.module';
import { TaskUpdateTokensModule } from './task-update-tokens/task-update-tokens.module';
import { ShiftTypesModule } from './shift-types/shift-types.module';
import { ReportsModule } from './reports/reports.module';
import { ProjectFilesModule } from './project-files/project-files.module';

// Filtros y Guards
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(), // Para tareas programadas (notificaciones)
    PrismaModule,
    ProjectsModule,
    TasksModule,
    AvailabilityModule,
    RecurrenceModule,
    AttendanceModule,
    ResourceBookingModule,
    UsersModule,
    EmailModule,
    TaskUpdateTokensModule,
    ShiftTypesModule,
    ReportsModule,
    ProjectFilesModule,
    // NotificationsModule,
    // WorkSchedulesModule,
    // ResourcesModule,
    // TimeTrackingModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_FILTER,
      useFactory: () => new AllExceptionsFilter(),
    },
  ],
})
export class AppModule {}
