import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

/**
 * Interceptor global que elimina todos los headers CORS
 * para permitir que nginx gateway maneje CORS centralizadamente
 */
@Injectable()
export class RemoveCorsHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap(() => {
        // Eliminar todos los headers CORS que Express/NestJS pueda haber añadido
        response.removeHeader('Access-Control-Allow-Origin');
        response.removeHeader('Access-Control-Allow-Credentials');
        response.removeHeader('Access-Control-Allow-Methods');
        response.removeHeader('Access-Control-Allow-Headers');
        response.removeHeader('Access-Control-Max-Age');
        response.removeHeader('Access-Control-Expose-Headers');
        response.removeHeader('Vary');
      }),
    );
  }
}
