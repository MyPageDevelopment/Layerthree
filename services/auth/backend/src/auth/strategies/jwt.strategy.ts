import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { getSecret } from '../../common/utils/secrets.util';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: getSecret(
        'jwt_secret',
        'JWT_SECRET',
        configService.get('JWT_SECRET'),
      ),
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    // Inyectar allowedModules en el request para que otros servicios puedan validar permisos
    return { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      allowedModules: user.allowedModules || [],
    };
  }
}
