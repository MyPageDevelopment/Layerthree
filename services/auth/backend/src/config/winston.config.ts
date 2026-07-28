import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

// Determinar si estamos en producción
const isProduction = process.env.NODE_ENV === 'production';

// Configuración de Winston para el Auth Backend
export const winstonConfig = WinstonModule.createLogger({
  transports: [
    // Console transport - Formato colorizado para desarrollo
    new winston.transports.Console({
      level: isProduction ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.ms(),
        nestWinstonModuleUtilities.format.nestLike('AuthService', {
          colors: true,
          prettyPrint: true,
        }),
      ),
    }),

    // File transport - Errores
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // File transport - Todos los logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // File transport - Logs de autenticación (específico)
    new winston.transports.File({
      filename: 'logs/auth.log',
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.json(),
        winston.format((info) => {
          // Solo logs relacionados con autenticación
          const message = typeof info.message === 'string' ? info.message : '';
          if (
            info.context === 'AuthService' ||
            info.context === 'AuthController' ||
            message.includes('login') ||
            message.includes('token')
          ) {
            return info;
          }
          return false;
        })(),
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],

  // Nivel de log por defecto
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

  // Manejo de excepciones no capturadas
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
  ],

  // Manejo de rechazos de promesas no capturados
  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
    }),
  ],
});

// Helper para crear logger en cualquier servicio
export const createLogger = (context: string) => {
  const logger = winston.createLogger({
    defaultMeta: { context },
    transports: [
      new winston.transports.Console({
        level: isProduction ? 'info' : 'debug',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike(context, {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.json(),
        ),
      }),
    ],
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  });

  return WinstonModule.createLogger({
    instance: logger,
  });
};
