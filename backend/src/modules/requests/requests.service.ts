import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ExcelParserService } from './excel-parser.service';
import { determineItemType } from '../vans/vans.service';

export interface CreateRequestItemDto {
  productId?: string | null;
  sku?: string | null;
  productName?: string;
  quantity: number;
  unitMeasure?: string;
}

export interface CreateRequestDto {
  projectId?: string;
  projectName?: string;
  notes?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  items: CreateRequestItemDto[];
}

export interface DispatchItemDto {
  itemId: string;
  isChecked: boolean;
  deliveredQuantity: number;
}

export interface DispatchRequestDto {
  recipientName: string;
  photoUrl?: string;
  notes?: string;
  vanId?: string;
  items: DispatchItemDto[];
}

export interface SendSupplierQuoteDto {
  supplierEmail: string;
  supplierName?: string;
  requestCode?: string;
  items: { sku?: string; productName: string; quantity: number; unitMeasure?: string; notes?: string }[];
  customNotes?: string;
}

@Injectable()
export class RequestsService implements OnModuleInit {
  private logger = new Logger(RequestsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private excelParserService: ExcelParserService,
  ) {}

  onModuleInit() {
    // Run cleanup on startup and schedule every 24h
    this.cleanupOldFilesAndPhotos();
    setInterval(() => {
      this.cleanupOldFilesAndPhotos();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Limpieza automática de fotos y archivos adjuntos con más de 30 días (1 mes) de antigüedad.
   */
  async cleanupOldFilesAndPhotos() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await this.prisma.materialRequest.updateMany({
        where: {
          updatedAt: { lt: thirtyDaysAgo },
          OR: [
            { photoUrl: { not: null } },
            { attachmentUrl: { not: null } },
          ],
        },
        data: {
          photoUrl: null,
          attachmentUrl: null,
          attachmentName: null,
        },
      });
      if (result.count > 0) {
        this.logger.log(`🧹 Política de Retención (30 días): Se han purgado fotos y adjuntos de ${result.count} solicitudes.`);
      }
    } catch (error) {
      this.logger.error('Error durante la purga de fotos y adjuntos antiguos:', error);
    }
  }

  async parseExcelFile(buffer: Buffer, fileName: string) {
    return this.excelParserService.parseExcelBuffer(buffer, fileName);
  }

  async create(requestedById: string, dto: CreateRequestDto) {
    const hasItems = dto.items && dto.items.length > 0;
    if (!hasItems && !dto.attachmentUrl && !dto.notes) {
      throw new BadRequestException('Debes incluir productos en la lista o adjuntar una foto/planilla');
    }

    const itemsInput = hasItems ? dto.items : [];
    const productIds = itemsInput.map((i) => i.productId).filter((id): id is string => Boolean(id));
    const dbProducts = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    const count = await this.prisma.materialRequest.count();
    const code = `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const request = await this.prisma.materialRequest.create({
      data: {
        code,
        projectId: dto.projectId || null,
        projectName: dto.projectName || 'Proyecto General',
        requestedById,
        notes: dto.notes || '',
        attachmentUrl: dto.attachmentUrl || null,
        attachmentName: dto.attachmentName || null,
        status: 'PENDING',
        items: {
          create: itemsInput.map((i) => {
            const prod = i.productId ? productMap.get(i.productId) : null;
            const name = i.productName || prod?.name || 'Producto';
            const sku = i.sku || prod?.sku || 'N/A';
            const isUtp = name.toUpperCase().includes('UTP') || sku.toUpperCase().includes('UTP');
            const unitMeasure = isUtp ? 'MTS' : (i.unitMeasure || prod?.unit || 'UN');

            return {
              productId: i.productId || null,
              productName: name,
              sku,
              requestedQuantity: i.quantity,
              deliveredQuantity: 0,
              unitMeasure,
              isChecked: false,
            };
          }),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        van: true,
      },
    });

    // Notify all Bodegueros in App and via Email
    const targetUsers = await this.prisma.user.findMany({
      where: {
        role: 'BODEGUERO',
        isActive: true,
      },
    });

    const itemCountText = hasItems ? `${itemsInput.length} ítems` : 'foto/planilla adjunta (sin lista)';

    for (const user of targetUsers) {
      await this.prisma.appNotification.create({
        data: {
          userId: user.id,
          title: `📦 Nueva Solicitud de Materiales (${code})`,
          message: `El usuario ${request.requestedBy.name || request.requestedBy.email} ha enviado una solicitud (${itemCountText}) para el proyecto "${request.projectName}".`,
          link: `/solicitudes?highlight=${request.id}`,
        },
      });

      // Do NOT send notification email to the person creating the request
      if (user.email && user.id !== requestedById) {
        this.mailService
          .sendMaterialRequestEmail(
            user.email,
            code,
            request.requestedBy.name || request.requestedBy.email,
            request.projectName || 'Proyecto General',
            itemsInput.length,
          )
          .catch((err) => this.logger.error(`Error enviando correo de solicitud a ${user.email}:`, err));
      }
    }

    return request;
  }

  async findAll(userId: string, userRole: string) {
    return this.prisma.materialRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: true } },
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        van: true,
      },
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.materialRequest.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        van: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    return request;
  }

  async dispatch(id: string, bodegueroUserId: string, dto: DispatchRequestDto) {
    const request = await this.findOne(id);

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Esta solicitud ya ha sido procesada');
    }

    if (!dto.recipientName || dto.recipientName.trim() === '') {
      throw new BadRequestException('Debes indicar el nombre de la persona responsable que recibe los materiales');
    }

    let vanObj: any = null;
    if (dto.vanId) {
      vanObj = await this.prisma.van.findUnique({ where: { id: dto.vanId } });
    }

    // Pre-validate stock sufficiency for all checked items
    for (const itemDto of dto.items) {
      if (!itemDto.isChecked) continue;
      const dbItem = request.items.find((i) => i.id === itemDto.itemId);
      if (!dbItem || !dbItem.productId) continue;

      const deliveredQty = itemDto.deliveredQuantity || dbItem.requestedQuantity;
      if (deliveredQty > 0) {
        const prod = await this.prisma.product.findUnique({ where: { id: dbItem.productId } });
        if (prod && prod.stock < deliveredQty) {
          throw new BadRequestException(
            `Stock insuficiente en Bodega para "${prod.name}". Disponible: ${prod.stock}, Solicitado: ${deliveredQty}`,
          );
        }
      }
    }

    // Process items, update stock & assign to Van if vanId selected
    for (const itemDto of dto.items) {
      const dbItem = request.items.find((i) => i.id === itemDto.itemId);
      if (!dbItem) continue;

      const deliveredQty = itemDto.isChecked ? itemDto.deliveredQuantity || dbItem.requestedQuantity : 0;

      await this.prisma.materialRequestItem.update({
        where: { id: itemDto.itemId },
        data: {
          isChecked: itemDto.isChecked,
          deliveredQuantity: deliveredQty,
        },
      });

      if (itemDto.isChecked && deliveredQty > 0 && dbItem.productId) {
        // Create movement entry (EXIT / SALIDA)
        await this.prisma.movement.create({
          data: {
            productId: dbItem.productId,
            projectId: request.projectId || null,
            type: 'EXIT',
            quantity: deliveredQty,
            notes: `Despacho de Solicitud ${request.code} entregado a: ${dto.recipientName}${vanObj ? ` (Camioneta: ${vanObj.plate} - ${vanObj.name})` : ''}`,
            userId: bodegueroUserId,
          },
        });

        // Decrement product stock
        await this.prisma.product.update({
          where: { id: dbItem.productId },
          data: {
            stock: { decrement: deliveredQty },
          },
        });

        // Automatically update Van Stock if vanId selected
        if (vanObj && dbItem.product) {
          const existingVanItem = await this.prisma.vanItem.findFirst({
            where: {
              vanId: vanObj.id,
              OR: [{ productId: dbItem.productId }, { name: dbItem.product.name }],
            },
          });

          if (existingVanItem) {
            await this.prisma.vanItem.update({
              where: { id: existingVanItem.id },
              data: {
                quantity: { increment: deliveredQty },
                type: determineItemType(dbItem.product),
              },
            });
          } else {
            await this.prisma.vanItem.create({
              data: {
                vanId: vanObj.id,
                productId: dbItem.productId,
                name: dbItem.product.name,
                sku: dbItem.product.sku,
                category: dbItem.product.category,
                type: determineItemType(dbItem.product),
                quantity: deliveredQty,
                minQuantity: 1,
                assignedTo: vanObj.driver || dto.recipientName,
              },
            });
          }
        }
      }
    }

    const updatedRequest = await this.prisma.materialRequest.update({
      where: { id },
      data: {
        status: 'DISPATCHED',
        assignedToId: bodegueroUserId,
        recipientName: dto.recipientName,
        photoUrl: dto.photoUrl,
        vanId: dto.vanId || null,
        notes: dto.notes ? `${request.notes || ''}\n[Despacho]: ${dto.notes}` : request.notes,
      },
      include: {
        items: { include: { product: true } },
        requestedBy: true,
        van: true,
      },
    });

    // Notify project requester via App & Email
    const notificationUsers = await this.prisma.user.findMany({
      where: {
        id: request.requestedById,
        isActive: true,
      },
    });

    for (const u of notificationUsers) {
      await this.prisma.appNotification.create({
        data: {
          userId: u.id,
          title: `✅ Solicitud Entregada (${request.code})`,
          message: `Los materiales del proyecto "${request.projectName}" fueron despachados y entregados a: ${dto.recipientName}.${vanObj ? ` (Asignados a Camioneta ${vanObj.plate})` : ''}`,
          link: `/solicitudes?highlight=${request.id}`,
        },
      });

      // Do NOT send notification email to the Bodeguero performing the dispatch
      if (u.email && u.id !== bodegueroUserId) {
        this.mailService
          .sendMaterialDispatchedEmail(
            u.email,
            request.code,
            dto.recipientName,
            vanObj ? `${vanObj.plate} (${vanObj.name})` : undefined,
          )
          .catch((err) => this.logger.error(`Error enviando correo de despacho a ${u.email}:`, err));
      }
    }

    return updatedRequest;
  }

  async sendSupplierQuote(user: any, dto: SendSupplierQuoteDto) {
    if (!dto.supplierEmail || !dto.supplierEmail.trim()) {
      throw new BadRequestException('Debes proporcionar el correo electrónico del proveedor');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Debes incluir al menos un producto para solicitar cotización');
    }

    const senderName = user ? `${user.name || user.email}` : 'Bodega Layerthree';

    const success = await this.mailService.sendSupplierQuoteEmail(
      dto.supplierEmail,
      dto.supplierName || 'Proveedor',
      dto.requestCode || 'SOLICITUD-COTIZACION',
      dto.items.map((i) => ({
        sku: i.sku || '',
        productName: i.productName,
        quantity: i.quantity,
        unitMeasure: i.unitMeasure || 'UN',
        notes: i.notes,
      })),
      senderName,
      dto.customNotes,
    );

    return {
      success,
      message: success
        ? 'Correo de cotización enviado exitosamente al proveedor'
        : 'Formato generado correctamente (modo simulación SMTP)',
    };
  }
}
