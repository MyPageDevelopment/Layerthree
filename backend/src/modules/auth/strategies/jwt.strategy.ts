import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { getSecret } from '../../../common/utils/secrets.util';

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
        configService.get('JWT_SECRET', 'secret_default_key_layerthree'),
      ),
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      allowedModules: user.allowedModules || [],
    };
  }
}
