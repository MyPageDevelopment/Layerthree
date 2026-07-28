import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'inventory-backend',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  @Get()
  root() {
    return {
      message: 'Inventory Service API - Microservices Architecture',
      version: '2.0.0',
      service: 'inventory',
      endpoints: {
        health: '/health',
        auth: '/auth',
        products: '/products',
        movements: '/movements',
        reports: '/reports',
      },
    };
  }
}
