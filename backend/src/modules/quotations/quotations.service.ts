import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ExcelParserService } from '../requests/excel-parser.service';
import { InvoiceParserService } from './invoice-parser.service';

export interface CreateQuotationItemDto {
  productName: string;
  productId?: string;
  quantity: number;
  unitMeasure?: string;
  estimatedUnitPrice?: number;
  supplier?: string;
  itemNotes?: string;
  linkUrl?: string;
}

export interface CreateQuotationDto {
  title: string;
  customCode?: string;
  destinationType?: 'PROYECTO' | 'STOCK_BODEGA';
  deliveryType?: 'RETIRO_SUCURSAL' | 'DESPACHO_DOMICILIO';
  projectId?: string;
  projectName?: string;
  pickupWorkerId?: string;
  pickupWorkerName?: string;
  notificationEmail?: string;
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  items?: CreateQuotationItemDto[];
}

export interface UpdateQuoteItemDto {
  id: string;
  estimatedUnitPrice: number;
  supplier?: string;
  itemNotes?: string;
}

export interface BodegueroQuoteResponseDto {
  bodegueroNotes?: string;
  responseAttachmentUrl?: string;
  responseAttachmentName?: string;
  totalEstimatedCost?: number;
  itemUpdates?: UpdateQuoteItemDto[];
}

export interface UploadPurchaseDocDto {
  documentType: 'COTIZACION' | 'ORDEN_COMPRA' | 'FACTURA' | 'OTRO';
  fileUrl: string;
  fileName: string;
}

export interface UpdateWorkflowStatusDto {
  status: 'PENDING_QUOTE' | 'QUOTED' | 'ORDER_PLACED' | 'IN_PROCESSING' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'CANCELLED';
  deliveryType?: 'RETIRO_SUCURSAL' | 'DESPACHO_DOMICILIO';
  pickupWorkerId?: string;
  pickupWorkerName?: string;
  notificationEmail?: string;
  sendEmailNotification?: boolean;
  notes?: string;
}

export interface ConfirmInvoiceItemDto {
  productId?: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  unitMeasure?: string;
}

export interface ConfirmInvoiceReceiptDto {
  invoiceNumber?: string;
  supplierRut?: string;
  supplierName?: string;
  notes?: string;
  items: ConfirmInvoiceItemDto[];
}

@Injectable()
export class QuotationsService implements OnModuleInit {
  private logger = new Logger(QuotationsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private excelParserService: ExcelParserService,
    private invoiceParserService: InvoiceParserService,
  ) {}

  async parseExcelFile(buffer: Buffer, fileName: string) {
    return this.excelParserService.parseExcelBuffer(buffer, fileName);
  }

  onModuleInit() {
    this.cleanupOldAttachments();
    setInterval(() => {
      this.cleanupOldAttachments();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Limpieza automática de archivos adjuntos de cotizaciones con más de 30 días (1 mes) de antigüedad.
   */
  async cleanupOldAttachments() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await this.prisma.quotationRequest.updateMany({
        where: {
          updatedAt: { lt: thirtyDaysAgo },
          OR: [
            { attachmentUrl: { not: null } },
            { responseAttachmentUrl: { not: null } },
          ],
        },
        data: {
          attachmentUrl: null,
          attachmentName: null,
          responseAttachmentUrl: null,
          responseAttachmentName: null,
        },
      });
      if (result.count > 0) {
        this.logger.log(`🧹 Política de Retención Cotizaciones (30 días): Se han purgado adjuntos de ${result.count} cotizaciones.`);
      }
    } catch (error) {
      this.logger.error('Error durante la purga de adjuntos de cotizaciones:', error);
    }
  }

  async create(userId: string, dto: CreateQuotationDto) {
    const count = await this.prisma.quotationRequest.count();
    const year = new Date().getFullYear();
    const code = `COMPRA-${year}-${String(count + 1).padStart(4, '0')}`;

    // Find a default warehouse manager (BODEGUERO) to assign if available
    const bodeguero = await this.prisma.user.findFirst({
      where: { role: 'BODEGUERO', isActive: true },
    });

    const items = dto.items || [];
    const totalEst = items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.estimatedUnitPrice || 0),
      0,
    );

    const initialDocs = [];
    if (dto.attachmentUrl) {
      initialDocs.push({
        id: `doc-${Date.now()}`,
        type: 'COTIZACION',
        name: dto.attachmentName || 'Cotización Inicial',
        url: dto.attachmentUrl,
        uploadedAt: new Date().toISOString(),
      });
    }

    const quotation = await this.prisma.quotationRequest.create({
      data: {
        code,
        customCode: dto.customCode || null,
        destinationType: (dto.destinationType as any) || 'STOCK_BODEGA',
        deliveryType: (dto.deliveryType as any) || null,
        title: dto.title,
        projectId: dto.projectId || null,
        projectName: dto.projectName || (dto.destinationType === 'PROYECTO' ? 'Proyecto' : 'Stock de Bodega'),
        pickupWorkerId: dto.pickupWorkerId || null,
        pickupWorkerName: dto.pickupWorkerName || null,
        notificationEmail: dto.notificationEmail || null,
        notes: dto.notes || null,
        attachmentUrl: dto.attachmentUrl || null,
        attachmentName: dto.attachmentName || null,
        documentsJson: initialDocs.length > 0 ? JSON.stringify(initialDocs) : null,
        requestedById: userId,
        assignedToId: bodeguero ? bodeguero.id : null,
        status: 'PENDING_QUOTE',
        totalEstimatedCost: totalEst,
        items: {
          create: items.map((item) => ({
            productName: item.productName,
            productId: item.productId || null,
            quantity: item.quantity,
            unitMeasure: item.unitMeasure || 'UN',
            estimatedUnitPrice: item.estimatedUnitPrice || 0,
            supplier: item.supplier || null,
            itemNotes: item.itemNotes || null,
            linkUrl: item.linkUrl || null,
          })),
        },
      },
      include: {
        items: true,
        requestedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        pickupWorker: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    // Notify Bodegueros via App & Email
    const bodegueros = await this.prisma.user.findMany({
      where: { role: 'BODEGUERO', isActive: true },
    });

    for (const b of bodegueros) {
      await this.prisma.appNotification.create({
        data: {
          userId: b.id,
          title: `🛍️ Nuevo Flujo de Compra (${code})`,
          message: `Se ha iniciado un flujo de compra para: "${dto.title}" (${quotation.projectName}).`,
          link: '/cotizaciones',
        },
      });
    }

    return quotation;
  }

  async findAll(userId: string, userRole: string) {
    return this.prisma.quotationRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: true },
        },
        requestedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        pickupWorker: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const quotation = await this.prisma.quotationRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        requestedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true },
        },
        pickupWorker: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!quotation) {
      throw new NotFoundException('Flujo de compra no encontrado');
    }

    return quotation;
  }

  /**
   * Adjunta un documento en cualquier formato (PDF, Word, Excel, Imagen) al directorio del flujo de compra
   */
  async uploadDocument(id: string, user: any, dto: UploadPurchaseDocDto) {
    const quotation = await this.findOne(id);

    let docs: any[] = [];
    if (quotation.documentsJson) {
      try {
        docs = JSON.parse(quotation.documentsJson);
      } catch (e) {}
    }

    const newDoc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: dto.documentType,
      name: dto.fileName,
      url: dto.fileUrl,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user ? (user.name || user.email) : 'Usuario',
    };

    docs.push(newDoc);

    const updateData: any = {
      documentsJson: JSON.stringify(docs),
    };

    // Auto-update document shortcuts based on type
    if (dto.documentType === 'COTIZACION') {
      updateData.attachmentUrl = dto.fileUrl;
      updateData.attachmentName = dto.fileName;
      if (quotation.status === 'PENDING_QUOTE') {
        updateData.status = 'QUOTED';
      }
    } else if (dto.documentType === 'ORDEN_COMPRA') {
      updateData.ocAttachmentUrl = dto.fileUrl;
      updateData.ocAttachmentName = dto.fileName;
      if (quotation.status === 'PENDING_QUOTE' || quotation.status === 'QUOTED') {
        updateData.status = 'ORDER_PLACED';
      }
    } else if (dto.documentType === 'FACTURA') {
      updateData.invoiceAttachmentUrl = dto.fileUrl;
      updateData.invoiceAttachmentName = dto.fileName;
    }

    return this.prisma.quotationRequest.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        requestedBy: true,
        assignedTo: true,
        pickupWorker: true,
      },
    });
  }

  /**
   * Actualiza el estado y seguimiento del pedido (En tramitación, Listo para despacho/retiro, Cancelado)
   */
  async updateWorkflowStatus(id: string, user: any, dto: UpdateWorkflowStatusDto) {
    const quotation = await this.findOne(id);

    const updateData: any = {
      status: dto.status as any,
    };

    if (dto.deliveryType) updateData.deliveryType = dto.deliveryType as any;
    if (dto.pickupWorkerId !== undefined) updateData.pickupWorkerId = dto.pickupWorkerId || null;
    if (dto.pickupWorkerName !== undefined) updateData.pickupWorkerName = dto.pickupWorkerName || null;
    if (dto.notificationEmail !== undefined) updateData.notificationEmail = dto.notificationEmail || null;
    if (dto.notes) updateData.notes = `${quotation.notes || ''}\n[${dto.status}]: ${dto.notes}`.trim();

    const updated = await this.prisma.quotationRequest.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        requestedBy: true,
        assignedTo: true,
        pickupWorker: true,
      },
    });

    const statusLabels: Record<string, string> = {
      PENDING_QUOTE: 'Cotización Pendiente',
      QUOTED: 'Cotizado',
      ORDER_PLACED: 'Orden de Compra Emitida',
      IN_PROCESSING: 'En Tramitación',
      READY_FOR_PICKUP: 'Materiales Listos para Retiro/Despacho',
      COMPLETED: 'Completado / Facturado',
      CANCELLED: 'Cancelado / Cerrado',
    };

    // Send email notification if specified or required for pickup assignment
    const targetEmail = dto.notificationEmail || (updated.pickupWorker ? updated.pickupWorker.email : null);
    if (dto.sendEmailNotification && targetEmail) {
      const subject = `🚚 Actualización de Pedido (${quotation.code}): ${statusLabels[dto.status] || dto.status}`;
      const textMsg = `Estimado(a),\n\nEl pedido/compra "${quotation.title}" (${quotation.code}) ha cambiado de estado a: ${statusLabels[dto.status] || dto.status}.\n` +
        (dto.deliveryType === 'RETIRO_SUCURSAL' ? `Modalidad: Retiro en Sucursal/Oficina\nResponsable Retiro: ${dto.pickupWorkerName || 'Asignado'}\n` : `Modalidad: Despacho a Domicilio/Obra\n`) +
        `Observaciones: ${dto.notes || 'Sin observaciones adicionales'}.\n\nIntranet Layerthree.`;

      this.mailService
        .sendMail(targetEmail, subject, textMsg, textMsg)
        .catch((err) => this.logger.error(`Error enviando notificación por correo a ${targetEmail}:`, err));
    }

    return updated;
  }

  /**
   * Ejecuta el análisis inteligente OCR / Texto de Facturas para pre-llenar y pre-mapear con bodega
   */
  async parseInvoiceText(rawText: string) {
    return this.invoiceParserService.parseInvoiceContent(rawText);
  }

  /**
   * Recepción final de materiales con Factura confirmada: Incrementa Stock en Bodega y Registra Movimientos (ENTRY)
   */
  async confirmInvoiceReceipt(id: string, user: any, dto: ConfirmInvoiceReceiptDto) {
    const quotation = await this.findOne(id);
    const uId = user?.id || user?.userId;
    const userName = user ? (user.name || user.email) : 'Bodega';

    // 1. Update quotation workflow status to COMPLETED
    const updatedQuotation = await this.prisma.quotationRequest.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        invoiceNumber: dto.invoiceNumber || quotation.invoiceNumber || null,
        supplierRut: dto.supplierRut || quotation.supplierRut || null,
        supplierName: dto.supplierName || quotation.supplierName || null,
        notes: dto.notes ? `${quotation.notes || ''}\n[Recepción Factura ${dto.invoiceNumber || ''}]: ${dto.notes}` : quotation.notes,
      },
      include: {
        items: true,
        requestedBy: true,
        assignedTo: true,
      },
    });

    // 2. Process each confirmed item and update inventory stock
    for (const item of dto.items) {
      if (!item.quantity || item.quantity <= 0) continue;

      let productId = item.productId;

      // If item was matched to an existing warehouse product
      if (productId) {
        const prod = await this.prisma.product.findUnique({ where: { id: productId } });
        if (prod) {
          // Increment warehouse product stock
          await this.prisma.product.update({
            where: { id: prod.id },
            data: {
              stock: { increment: item.quantity },
              unitCost: item.unitPrice && item.unitPrice > 0 ? item.unitPrice : prod.unitCost,
            },
          });

          // Record movement ENTRY
          if (uId) {
            await this.prisma.movement.create({
              data: {
                productId: prod.id,
                projectId: quotation.projectId || null,
                type: 'ENTRY',
                quantity: item.quantity,
                notes: `📥 Recepción Factura N° ${dto.invoiceNumber || 'S/N'} (${dto.supplierName || 'Proveedor'}) - Flujo: ${quotation.code} por ${userName}`,
                userId: uId,
              },
            });
          }
        }
      }
    }

    return updatedQuotation;
  }

  async updateQuoteItems(id: string, user: any, responseDto: BodegueroQuoteResponseDto | UpdateQuoteItemDto[]) {
    const quotation = await this.findOne(id);

    let itemUpdates: UpdateQuoteItemDto[] = [];
    let bodegueroNotes: string | undefined;
    let responseAttachmentUrl: string | undefined;
    let responseAttachmentName: string | undefined;
    let customTotal: number | undefined;

    if (Array.isArray(responseDto)) {
      itemUpdates = responseDto;
    } else {
      itemUpdates = responseDto.itemUpdates || [];
      bodegueroNotes = responseDto.bodegueroNotes;
      responseAttachmentUrl = responseDto.responseAttachmentUrl;
      responseAttachmentName = responseDto.responseAttachmentName;
      customTotal = responseDto.totalEstimatedCost;
    }

    let calculatedTotal = 0;

    for (const update of itemUpdates) {
      const existingItem = quotation.items.find((i) => i.id === update.id);
      if (existingItem) {
        const itemTotal = existingItem.quantity * (update.estimatedUnitPrice || 0);
        calculatedTotal += itemTotal;

        await this.prisma.quotationItem.update({
          where: { id: update.id },
          data: {
            estimatedUnitPrice: update.estimatedUnitPrice,
            supplier: update.supplier || null,
            itemNotes: update.itemNotes || null,
          },
        });
      }
    }

    const finalTotal = customTotal !== undefined && customTotal > 0 ? customTotal : calculatedTotal;

    const updatedQuotation = await this.prisma.quotationRequest.update({
      where: { id },
      data: {
        status: 'QUOTED',
        assignedToId: user.id || user.userId,
        totalEstimatedCost: finalTotal,
        bodegueroNotes: bodegueroNotes !== undefined ? bodegueroNotes : quotation.bodegueroNotes,
        responseAttachmentUrl: responseAttachmentUrl !== undefined ? responseAttachmentUrl : quotation.responseAttachmentUrl,
        responseAttachmentName: responseAttachmentName !== undefined ? responseAttachmentName : quotation.responseAttachmentName,
      },
      include: {
        items: true,
        requestedBy: true,
        assignedTo: true,
      },
    });

    return updatedQuotation;
  }

  async updateStatus(id: string, user: any, status: any) {
    const quotation = await this.findOne(id);

    const updated = await this.prisma.quotationRequest.update({
      where: { id },
      data: { status: status as any },
      include: { items: true, requestedBy: true, assignedTo: true },
    });

    return updated;
  }

  async remove(id: string) {
    const quotation = await this.findOne(id);

    await this.prisma.quotationItem.deleteMany({
      where: { quotationRequestId: id },
    });

    return this.prisma.quotationRequest.delete({
      where: { id },
    });
  }
}
