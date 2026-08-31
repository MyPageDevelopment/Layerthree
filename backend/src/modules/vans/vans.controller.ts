import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VansService } from './vans.service';
import { CreateVanDto } from './dto/create-van.dto';
import { AddVanItemDto } from './dto/add-van-item.dto';
import { RemoveVanItemDto } from './dto/remove-van-item.dto';
import { CreateVanMaintenanceDto } from './dto/create-van-maintenance.dto';

@ApiTags('vans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vans')
export class VansController {
  constructor(private readonly vansService: VansService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las camionetas con resumen de ítems y mantenciones' })
  findAll() {
    return this.vansService.findAll();
  }

  @Get('maintenances/overview')
  @ApiOperation({ summary: 'Obtener resumen general y estadísticas de mantenciones de toda la flota' })
  getMaintenancesOverview() {
    return this.vansService.getAllMaintenancesSummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una camioneta con sus herramientas, materiales y mantenciones' })
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

  /* ============================================================
     ENDPOINTS MANTENCIONES
     ============================================================ */

  @Get(':id/maintenances')
  @ApiOperation({ summary: 'Obtener historial de mantenciones de una camioneta' })
  getMaintenances(@Param('id') id: string) {
    return this.vansService.getMaintenances(id);
  }

  @Post(':id/maintenances')
  @ApiOperation({ summary: 'Registrar una nueva mantención para una camioneta' })
  addMaintenance(
    @Param('id') id: string,
    @Body() dto: CreateVanMaintenanceDto,
    @Request() req: any,
  ) {
    return this.vansService.addMaintenance(id, dto, req.user);
  }

  @Patch(':id/maintenances/:mId')
  @ApiOperation({ summary: 'Actualizar un registro de mantención' })
  updateMaintenance(
    @Param('id') id: string,
    @Param('mId') mId: string,
    @Body() dto: Partial<CreateVanMaintenanceDto>,
  ) {
    return this.vansService.updateMaintenance(id, mId, dto);
  }

  @Delete(':id/maintenances/:mId')
  @ApiOperation({ summary: 'Eliminar un registro de mantención' })
  deleteMaintenance(
    @Param('id') id: string,
    @Param('mId') mId: string,
  ) {
    return this.vansService.deleteMaintenance(id, mId);
  }

  /* ============================================================
     ENDPOINTS STOCK HERRAMIENTAS Y MATERIALES
     ============================================================ */

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
  @ApiOperation({ summary: 'Eliminar o retirar ítem de la camioneta' })
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Query() queryDto: RemoveVanItemDto,
    @Body() bodyDto: RemoveVanItemDto,
    @Request() req: any,
  ) {
    const returnToWarehouseRaw = bodyDto?.returnToWarehouse ?? queryDto?.returnToWarehouse;
    const returnToWarehouse =
      typeof returnToWarehouseRaw === 'string'
        ? (returnToWarehouseRaw as string).toLowerCase() === 'true'
        : (returnToWarehouseRaw ?? true);

    const dto: RemoveVanItemDto = {
      quantity: bodyDto?.quantity ?? (queryDto?.quantity ? Number(queryDto.quantity) : undefined),
      returnToWarehouse,
      notes: bodyDto?.notes || queryDto?.notes,
    };
    return this.vansService.removeItem(id, itemId, dto, req.user);
  }

  @Post(':id/items/:itemId/remove')
  @ApiOperation({ summary: 'Retirar o dar de baja ítem de la camioneta' })
  removeItemPost(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() bodyDto: RemoveVanItemDto,
    @Request() req: any,
  ) {
    return this.vansService.removeItem(id, itemId, bodyDto, req.user);
  }
}
