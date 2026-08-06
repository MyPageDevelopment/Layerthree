import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RequestsService, CreateRequestDto, DispatchRequestDto, SendSupplierQuoteDto } from './requests.service';
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

  @Post('parse-excel')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Analizar e interpretar planilla Excel o CSV de materiales' })
  async parseExcel(
    @UploadedFile() file?: any,
    @Body() body?: { fileBase64?: string; fileName?: string },
  ) {
    let buffer: Buffer;
    let name = 'planilla.xlsx';

    if (file && file.buffer) {
      buffer = file.buffer;
      name = file.originalname || 'planilla.xlsx';
    } else if (body && body.fileBase64) {
      name = body.fileName || 'planilla.xlsx';
      const cleanBase64 = body.fileBase64.replace(/^data:.*?;base64,/, '');
      buffer = Buffer.from(cleanBase64, 'base64');
    } else {
      throw new BadRequestException('Debes adjuntar un archivo de Excel/CSV o enviar fileBase64');
    }

    return this.requestsService.parseExcelFile(buffer, name);
  }

  @Post('send-supplier-quote-email')
  @Roles('BODEGUERO', 'SUPER_ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Enviar correo formal de cotización a proveedor para ítems sin stock' })
  async sendSupplierQuoteEmail(@Request() req, @Body() dto: SendSupplierQuoteDto) {
    return this.requestsService.sendSupplierQuote(req.user, dto);
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
