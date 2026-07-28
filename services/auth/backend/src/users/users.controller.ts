import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Endpoint público para sincronización entre microservicios
   * No requiere autenticación - Solo para uso interno
   */
  @Get('list-all')
  @ApiOperation({ summary: 'Listar todos los usuarios (Endpoint interno para microservicios)' })
  async listAllForMicroservices() {
    return this.usersService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Crear nuevo usuario (Solo Super Admin)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Listar todos los usuarios (Solo Super Admin)' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Actualizar usuario (Solo Super Admin)' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Eliminar usuario (Solo Super Admin)' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
