import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private store: RateLimitStore = {};
  private readonly limit = 100;
  private readonly windowMs = 15 * 60 * 1000;

  use(req: Request, res: Response, next: NextFunction) {
    const key = this.getKey(req);
    const now = Date.now();

    if (this.store[key] && this.store[key].resetTime < now) {
      delete this.store[key];
    }

    if (!this.store[key]) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
    } else {
      this.store[key].count++;
    }

    const remaining = this.limit - this.store[key].count;

    res.setHeader('X-RateLimit-Limit', this.limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining).toString());
    res.setHeader('X-RateLimit-Reset', new Date(this.store[key].resetTime).toISOString());

    if (this.store[key].count > this.limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Demasiadas solicitudes. Por favor, intente más tarde.',
          retryAfter: Math.ceil((this.store[key].resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }

  private getKey(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const ip = forwarded ? forwarded.split(',')[0] : req.socket.remoteAddress;
    return `ratelimit:${ip}`;
  }

  cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }
}
