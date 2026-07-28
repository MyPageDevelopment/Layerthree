import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate Limiting Global
    ThrottlerModule.forRoot([{
      ttl: 60000,      // 60 segundos
      limit: 10,       // 10 requests por minuto
    }]),
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    // Aplicar ThrottlerGuard globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
