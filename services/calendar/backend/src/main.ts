import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { RemoveCorsHeadersInterceptor } from './common/interceptors/remove-cors-headers.interceptor';
import { EmailService } from './emails/email.service';
import { getSecret } from './common/utils/secrets.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    // CORS eliminado - Nginx Gateway lo maneja
    // Evita headers duplicados y centraliza política CORS
  });

  // CORS manejado por Nginx Gateway

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Calendar & Time Management API')
    .setDescription(
      'Microservicio de Calendario y Gestión de Tiempos - Sistema Intranet Layerthree',
    )
    .setVersion('1.0')
    .addTag('projects', 'Gestión de Proyectos')
    .addTag('tasks', 'Gestión de Tareas')
    .addTag('availability', 'Validación de Disponibilidad')
    .addTag('resources', 'Gestión de Recursos')
    .addTag('schedules', 'Horarios y Jornadas Laborales')
    .addTag('notifications', 'Notificaciones y Alertas')
    .addTag('time-tracking', 'Registro de Tiempo')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Configurar servicio de email si hay credenciales en variables de entorno o secrets
  const emailService = app.get(EmailService);
  const smtpUser = process.env.SMTP_USER;
  let smtpPass: string | undefined;
  
  // Intentar leer password desde secret o variable de entorno
  try {
    smtpPass = getSecret('smtp_password', 'SMTP_PASS');
  } catch (error) {
    smtpPass = process.env.SMTP_PASS;
  }
  
  if (smtpUser && smtpPass) {
    try {
      emailService.configureEmail({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      
      const isConnected = await emailService.verifyConnection();
      if (isConnected) {
        console.log('✅ Email service configured and connected successfully');
      } else {
        console.warn('⚠️  Email service configured but connection failed');
      }
    } catch (error) {
      console.error('❌ Error configuring email service:', error.message);
    }
  } else {
    console.log('ℹ️  Email service not configured (SMTP credentials not provided)');
  }

  const port = process.env.PORT || 3003;
  await app.listen(port);

  console.log(`
  ====================================================
  🚀 Calendar Service started successfully!
  ====================================================
  📍 URL: http://localhost:${port}
  📚 Swagger Docs: http://localhost:${port}/api/docs
  🏥 Health Check: http://localhost:${port}/health
  ====================================================
  `);
}

bootstrap();
