import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  @Get()
  @Public()
  getInfo() {
    return {
      service: 'calendar-backend',
      version: '1.0.0',
      description: 'Microservicio de Calendario y Gestión de Tiempos',
      endpoints: {
        health: '/health',
        projects: '/projects',
        tasks: '/tasks',
        availability: '/availability',
        resources: '/resources',
        schedules: '/schedules',
        notifications: '/notifications',
        timeTracking: '/time-tracking',
      },
    };
  }

  @Get('health')
  @Public()
  health() {
    return {
      status: 'ok',
      service: 'calendar-backend',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
  }
}
