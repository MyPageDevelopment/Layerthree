import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { MovementsModule } from './movements/movements.module';
import { ReportsModule } from './reports/reports.module';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    MovementsModule,
    ReportsModule,
  ],
  controllers: [AppController],
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
      .apply(SecurityHeadersMiddleware, LoggerMiddleware, RateLimitMiddleware)
      .forRoutes('*');
  }
}
