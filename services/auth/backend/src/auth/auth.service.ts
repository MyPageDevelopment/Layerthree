import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const ALL_MODULES = ['inventory', 'projects', 'reports'];

    // Normalizar módulos permitidos
    const allowedModules = user.allowedModules
      ? (Array.isArray(user.allowedModules)
          ? user.allowedModules
          : typeof user.allowedModules === 'string'
            ? JSON.parse(user.allowedModules)
            : [])
      : [];

    // El superadmin siempre tiene acceso total
    const normalizedModules = user.role === 'SUPER_ADMIN'
      ? ALL_MODULES
      : Array.from(new Set(allowedModules));

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      allowedModules: normalizedModules,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        allowedModules: normalizedModules,
      },
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findOne(payload.sub);
      
      if (!user || !user.isActive) {
        throw new UnauthorizedException('Token inválido');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }
}
