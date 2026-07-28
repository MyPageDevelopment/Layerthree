import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 intentos por minuto
  @ApiOperation({ summary: 'Login de usuario' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()  // No limitar consultas de perfil autenticadas
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  async getProfile(@Request() req) {
    return req.user;
  }

  @Post('validate')
  @Throttle({ default: { limit: 20, ttl: 60000 } })  // 20 validaciones por minuto
  @ApiOperation({ summary: 'Validar token JWT' })
  async validateToken(@Body('token') token: string) {
    return this.authService.validateToken(token);
  }
}
