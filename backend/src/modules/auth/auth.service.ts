import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users/users.service';
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

    const allowedModules = user.allowedModules
      ? (Array.isArray(user.allowedModules)
          ? user.allowedModules
          : typeof user.allowedModules === 'string'
            ? JSON.parse(user.allowedModules)
            : [])
      : [];

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

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Return success even if user not found for security privacy
      return { message: 'Si el correo está registrado, recibirás las instrucciones de recuperación.' };
    }

    const resetToken = Math.random().toString(36).substring(2, 8).toUpperCase();
    const resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    await this.usersService.updateResetToken(user.id, resetToken, resetTokenExpires);

    console.log(`✉️ [EMAIL SIMULATOR] Para: ${email} | Código de Recuperación: ${resetToken}`);

    return {
      message: 'Si el correo está registrado, recibirás las instrucciones de recuperación.',
      devToken: resetToken, // Exposed in response for easy testing
    };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.resetToken || user.resetToken !== token) {
      throw new UnauthorizedException('Código de recuperación inválido o expirado');
    }

    if (user.resetTokenExpires && user.resetTokenExpires < new Date()) {
      throw new UnauthorizedException('El código de recuperación ha expirado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePasswordAndClearToken(user.id, hashedPassword);

    return { message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' };
  }
}
