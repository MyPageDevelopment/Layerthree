import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ShiftTypesService } from './shift-types.service';
import { CreateShiftTypeDto } from './dto/create-shift-type.dto';
import { UpdateShiftTypeDto } from './dto/update-shift-type.dto';
import { ShiftTypeResponseDto } from './dto/shift-type-response.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('shift-types')
@Controller('shift-types')
export class ShiftTypesController {
  constructor(private readonly shiftTypesService: ShiftTypesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Crear nuevo tipo de jornada (SUPER_ADMIN, GERENTE)' })
  @ApiResponse({ status: 201, description: 'Tipo de jornada creado exitosamente' })
  @ApiResponse({ status: 409, description: 'El código ya existe' })
  async create(@Body() createShiftTypeDto: CreateShiftTypeDto): Promise<ShiftTypeResponseDto> {
    const shiftType = await this.shiftTypesService.create(createShiftTypeDto);
    return plainToInstance(ShiftTypeResponseDto, shiftType, {
      excludeExtraneousValues: true,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los tipos de jornada' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<ShiftTypeResponseDto[]> {
    const shiftTypes = await this.shiftTypesService.findAll(includeInactive === 'true');
    return plainToInstance(ShiftTypeResponseDto, shiftTypes, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tipo de jornada por ID' })
  async findOne(@Param('id') id: string): Promise<ShiftTypeResponseDto> {
    const shiftType = await this.shiftTypesService.findOne(id);
    return plainToInstance(ShiftTypeResponseDto, shiftType, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Actualizar tipo de jornada (SUPER_ADMIN, GERENTE)' })
  async update(
    @Param('id') id: string,
    @Body() updateShiftTypeDto: UpdateShiftTypeDto,
  ): Promise<ShiftTypeResponseDto> {
    const shiftType = await this.shiftTypesService.update(id, updateShiftTypeDto);
    return plainToInstance(ShiftTypeResponseDto, shiftType, {
      excludeExtraneousValues: true,
    });
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Eliminar tipo de jornada (Solo SUPER_ADMIN)' })
  @ApiResponse({
    status: 409,
    description: 'No se puede eliminar porque tiene horarios asociados',
  })
  async remove(@Param('id') id: string): Promise<ShiftTypeResponseDto> {
    const shiftType = await this.shiftTypesService.remove(id);
    return plainToInstance(ShiftTypeResponseDto, shiftType, {
      excludeExtraneousValues: true,
    });
  }
}
