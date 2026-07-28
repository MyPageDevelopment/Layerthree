import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class ModulesGuard implements CanActivate {
  private readonly moduleName = 'inventory';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Permitir siempre al superadmin
    if (user?.role === 'SUPER_ADMIN') {
      return true;
    }

    const modules: string[] = user?.allowedModules || [];
    const hasAccess = Array.isArray(modules) && modules.includes(this.moduleName);

    if (!hasAccess) {
      throw new ForbiddenException('No tienes acceso a este módulo');
    }

    return true;
  }
}
