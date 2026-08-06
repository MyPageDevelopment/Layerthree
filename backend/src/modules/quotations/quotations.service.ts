import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ExcelParserService } from '../requests/excel-parser.service';

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
  projectId?: string;
  projectName?: string;
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  items: CreateQuotationItemDto[];
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

@Injectable()
export class QuotationsService implements OnModuleInit {
  private logger = new Logger(QuotationsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private excelParserService: ExcelParserService,
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
    if ((!dto.items || dto.items.length === 0) && !dto.attachmentUrl) {
      throw new BadRequestException('La cotización debe incluir ítems o un archivo adjunto');
    }

    const count = await this.prisma.quotationRequest.count();
    const year = new Date().getFullYear();
    const code = `COT-${year}-${String(count + 1).padStart(4, '0')}`;

    // Find a default warehouse manager (BODEGUERO) to assign if available
    const bodeguero = await this.prisma.user.findFirst({
      where: { role: 'BODEGUERO', isActive: true },
    });

    const items = dto.items || [];
    const totalEst = items.reduce(
      (sum, item) => sum + (item.quantity || 0) * (item.estimatedUnitPrice || 0),
      0,
    );

    const quotation = await this.prisma.quotationRequest.create({
      data: {
        code,
        title: dto.title,
        projectId: dto.projectId || null,
        projectName: dto.projectName || null,
        notes: dto.notes || null,
        attachmentUrl: dto.attachmentUrl || null,
        attachmentName: dto.attachmentName || null,
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
          title: `Nueva Solicitud de Cotización (${code})`,
          message: `El Jefe de Proyecto ha solicitado cotización para: "${dto.title}" (${dto.projectName || 'Sin Proyecto'}).`,
          link: '/cotizaciones',
        },
      });

      // Do NOT send notification email to the person creating the quotation request
      if (b.email && b.id !== userId) {
        this.mailService
          .sendQuotationRequestEmail(
            b.email,
            code,
            dto.title,
            quotation.requestedBy?.name || quotation.requestedBy?.email || 'Jefe de Proyecto',
          )
          .catch((err) => this.logger.error(`Error enviando correo de cotización a ${b.email}:`, err));
      }
    }

    return quotation;
  }

  async findAll(userId: string, userRole: string) {
    if (['SUPER_ADMIN', 'GERENTE', 'BODEGUERO'].includes(userRole)) {
      return this.prisma.quotationRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          requestedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
          assignedTo: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });
    }

    return this.prisma.quotationRequest.findMany({
      where: {
        OR: [{ requestedById: userId }, { assignedToId: userId }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        requestedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        assignedTo: {
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
      },
    });

    if (!quotation) {
      throw new NotFoundException('Cotización no encontrada');
    }

    return quotation;
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

    // Notify requester (Jefe de Proyecto) in App and via Email
    await this.prisma.appNotification.create({
      data: {
        userId: quotation.requestedById,
        title: `Cotización Listada (${quotation.code})`,
        message: `El Bodeguero ha completado la cotización para "${quotation.title}". Costo estimado: $${finalTotal.toLocaleString()}`,
        link: '/cotizaciones',
      },
    });

    const actorId = user?.id || user?.userId;
    if (quotation.requestedBy?.email && quotation.requestedById !== actorId) {
      this.mailService
        .sendQuotationResponseEmail(
          quotation.requestedBy.email,
          quotation.code,
          quotation.title,
          `Cotizada (Total: $${finalTotal.toLocaleString()})`,
        )
        .catch((err) => this.logger.error(`Error enviando respuesta de cotización a ${quotation.requestedBy?.email}:`, err));
    }

    return updatedQuotation;
  }

  async updateStatus(id: string, user: any, status: 'APPROVED' | 'REJECTED' | 'PURCHASED') {
    const quotation = await this.findOne(id);

    const updated = await this.prisma.quotationRequest.update({
      where: { id },
      data: { status: status as any },
      include: { items: true, requestedBy: true, assignedTo: true },
    });

    const statusLabels: Record<string, string> = {
      APPROVED: 'Aprobada',
      REJECTED: 'Rechazada',
      PURCHASED: 'Comprada / Finalizada',
    };

    // Notify requester
    await this.prisma.appNotification.create({
      data: {
        userId: quotation.requestedById,
        title: `Cotización ${statusLabels[status]} (${quotation.code})`,
        message: `La cotización "${quotation.title}" cambió su estado a ${statusLabels[status]}.`,
        link: '/cotizaciones',
      },
    });

    const statusActorId = user?.id || user?.userId;
    if (quotation.requestedBy?.email && quotation.requestedById !== statusActorId) {
      this.mailService
        .sendQuotationResponseEmail(
          quotation.requestedBy.email,
          quotation.code,
          quotation.title,
          statusLabels[status],
        )
        .catch((err) => this.logger.error(`Error enviando actualización de cotización a ${quotation.requestedBy?.email}:`, err));
    }

    return updated;
  }
}
