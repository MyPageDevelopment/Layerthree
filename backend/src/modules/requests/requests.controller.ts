import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequestsService, CreateRequestDto, DispatchRequestDto } from './requests.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Material Requests')
@Controller('requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear solicitud de materiales (Jefe de proyecto / Gerente / Admin)' })
  async create(@Request() req, @Body() dto: CreateRequestDto) {
    return this.requestsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar solicitudes del usuario o todas si es Bodeguero/Admin' })
  async findAll(@Request() req) {
    return this.requestsService.findAll(req.user.id, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de solicitud por ID' })
  async findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Patch(':id/dispatch')
  @Roles('BODEGUERO', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Confirmar entrega y despachar materiales (Solo Bodeguero / Admin)' })
  async dispatch(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: DispatchRequestDto,
  ) {
    return this.requestsService.dispatch(id, req.user.id, dto);
  }
}
