import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VansService } from './vans.service';
import { CreateVanDto } from './dto/create-van.dto';
import { AddVanItemDto } from './dto/add-van-item.dto';

@ApiTags('vans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vans')
export class VansController {
  constructor(private readonly vansService: VansService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las camionetas con resumen de ítems' })
  findAll() {
    return this.vansService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una camioneta con sus herramientas/materiales' })
  findOne(@Param('id') id: string) {
    return this.vansService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Registrar nueva camioneta' })
  create(@Body() dto: CreateVanDto) {
    return this.vansService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar información de la camioneta' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateVanDto>) {
    return this.vansService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una camioneta' })
  remove(@Param('id') id: string) {
    return this.vansService.remove(id);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Agregar material o herramienta a la camioneta' })
  addItem(@Param('id') id: string, @Body() dto: AddVanItemDto, @Request() req: any) {
    return this.vansService.addItem(id, dto, req.user);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Actualizar cantidad de un ítem en la camioneta' })
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body('quantity') quantity: number,
    @Request() req: any,
  ) {
    return this.vansService.updateItem(id, itemId, quantity, req.user);
  }

  @Delete(':id/items/:itemId')
  @ApiOperation({ summary: 'Eliminar ítem de la camioneta' })
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string, @Request() req: any) {
    return this.vansService.removeItem(id, itemId, req.user);
  }
}
