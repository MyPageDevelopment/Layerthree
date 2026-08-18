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
import {
  QuotationsService,
  CreateQuotationDto,
  UpdateQuoteItemDto,
} from './quotations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Quotations')
@Controller('quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear solicitud de cotización (Jefe de Proyecto / Gerente / Admin)' })
  async create(@Request() req, @Body() dto: CreateQuotationDto) {
    return this.quotationsService.create(req.user.id, dto);
  }

  @Post('parse-excel')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Analizar e interpretar planilla Excel o CSV de materiales para cotización' })
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

    return this.quotationsService.parseExcelFile(buffer, name);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cotizaciones asignadas o todas si es Bodeguero/Admin' })
  async findAll(@Request() req) {
    return this.quotationsService.findAll(req.user.id, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de cotización por ID' })
  async findOne(@Param('id') id: string) {
    return this.quotationsService.findOne(id);
  }

  @Patch(':id/quote')
  @Roles('BODEGUERO', 'SUPER_ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Ingresar precios y proveedores (Bodeguero / Admin)' })
  async updateQuoteItems(
    @Request() req,
    @Param('id') id: string,
    @Body('items') items: UpdateQuoteItemDto[],
  ) {
    return this.quotationsService.updateQuoteItems(id, req.user, items);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Adjuntar documento multiformato (Cotización, OC, Factura, etc.)' })
  async uploadDocument(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: { documentType: 'COTIZACION' | 'ORDEN_COMPRA' | 'FACTURA' | 'OTRO'; fileUrl: string; fileName: string },
  ) {
    return this.quotationsService.uploadDocument(id, req.user, dto);
  }

  @Patch(':id/workflow')
  @ApiOperation({ summary: 'Actualizar estado del flujo de compra y seguimiento' })
  async updateWorkflowStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.quotationsService.updateWorkflowStatus(id, req.user, dto);
  }

  @Post('parse-invoice-text')
  @ApiOperation({ summary: 'Analizar texto OCR de factura e interpretar ítems y RUT' })
  async parseInvoiceText(@Body('rawText') rawText: string) {
    return this.quotationsService.parseInvoiceText(rawText || '');
  }

  @Post(':id/confirm-invoice')
  @ApiOperation({ summary: 'Confirmar recepción de Factura e ingresar stock a Bodega/Proyecto' })
  async confirmInvoiceReceipt(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.quotationsService.confirmInvoiceReceipt(id, req.user, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Cambiar estado de la cotización (Aprobar, Rechazar, Comprar)' })
  async updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body('status') status: any,
  ) {
    return this.quotationsService.updateStatus(id, req.user, status);
  }
}
