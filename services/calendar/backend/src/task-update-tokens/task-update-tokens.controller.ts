import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TaskUpdateTokenService } from './task-update-tokens.service';

@ApiTags('Task Update Tokens')
@Controller('task-update-tokens')
export class TaskUpdateTokensController {
  constructor(private readonly tokenService: TaskUpdateTokenService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validar un token de actualización' })
  @ApiResponse({ status: 200, description: 'Token válido' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  @ApiResponse({ status: 404, description: 'Token no encontrado' })
  async validateToken(@Body('token') token: string) {
    const result = await this.tokenService.validateToken(token);
    return {
      valid: true,
      task: result.task,
      user: result.user,
      expiresAt: result.expiresAt,
    };
  }

  @Post('update-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualizar estado de tarea con token' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async updateStatus(
    @Body('token') token: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    const updatedTask = await this.tokenService.updateTaskStatus(token, status, notes);
    return {
      success: true,
      message: 'Estado de la tarea actualizado correctamente',
      task: updatedTask,
    };
  }

  @Get(':token/info')
  @ApiOperation({ summary: 'Obtener información de un token' })
  @ApiResponse({ status: 200, description: 'Información del token' })
  async getTokenInfo(@Param('token') token: string) {
    return this.tokenService.validateToken(token);
  }
}
