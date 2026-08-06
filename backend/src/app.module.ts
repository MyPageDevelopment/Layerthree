import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { RequestsModule } from './modules/requests/requests.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { MailModule } from './modules/mail/mail.module';
import { VansModule } from './modules/vans/vans.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    InventoryModule,
    CalendarModule,
    ActivitiesModule,
    RequestsModule,
    NotificationsModule,
    QuotationsModule,
    VansModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityHeadersMiddleware, LoggerMiddleware)
      .forRoutes('*');
  }
}
