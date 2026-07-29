import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;
      
      const logData = {
        timestamp: new Date().toISOString(),
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        ip,
        userAgent,
        user: (req as any).user?.email || 'anonymous',
      };

      const color = statusCode >= 500 ? '\x1b[31m' : statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
      const reset = '\x1b[0m';

      console.log(
        `${color}[${logData.timestamp}] ${method} ${originalUrl} ${statusCode} - ${duration}ms - ${logData.user}${reset}`,
      );
    });

    next();
  }
}
