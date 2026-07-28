import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS eliminado - Nginx Gateway lo maneja
  // Evita headers duplicados y centraliza política CORS

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0'); // Escuchar en todas las interfaces de red
  console.log(`🚀 Backend running on: http://0.0.0.0:${port}`);
  console.log(`🌐 Accessible from network at: http://172.16.11.174:${port}`);
}

bootstrap();
