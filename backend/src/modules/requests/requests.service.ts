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
  itemId?: string;
  productId?: string;
  productName?: string;
  sku?: string;
  unitMeasure?: string;
  serialNumber?: string;
  isChecked: boolean;
  deliveredQuantity: number;
}

export interface DispatchRequestDto {
  recipientName: string;
  photoUrl?: string;
  notes?: string;
  vanId?: string;
  items: DispatchItemDto[];
  removedItemIds?: string[];
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
    this.fixLegacyMovementsProject();
    setInterval(() => {
      this.cleanupOldFilesAndPhotos();
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Regularización retroactiva de movimientos pasados sin proyecto asignado
   */
  async fixLegacyMovementsProject() {
    try {
      const requests = await this.prisma.materialRequest.findMany({
        where: {
          status: 'DISPATCHED',
          projectName: { not: null },
        },
        select: {
          code: true,
          projectName: true,
          projectId: true,
        },
      });

      for (const req of requests) {
        const pName = req.projectName || req.projectId;
        if (!pName) continue;

        await this.prisma.movement.updateMany({
          where: {
            notes: { contains: `Despacho de Solicitud ${req.code}` },
            OR: [
              { projectId: null },
              { projectId: '' },
            ],
          },
          data: {
            projectId: pName,
          },
        });
      }
    } catch (err) {
      this.logger.error('Error regularizando proyectos en movimientos legados:', err);
    }
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

  private async generateNextCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}-`;
    const requests = await this.prisma.materialRequest.findMany({
      where: { code: { startsWith: prefix } },
      select: { code: true },
    });

    let maxNum = 0;
    for (const req of requests) {
      const parts = req.code.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextNum = maxNum + 1;
    return `${prefix}${String(nextNum).padStart(3, '0')}`;
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

    let request;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      const code = await this.generateNextCode();

      try {
        request = await this.prisma.materialRequest.create({
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
        break; // Successfully created
      } catch (error: any) {
        if (error.code === 'P2002' && attempts < maxAttempts) {
          this.logger.warn(`Colisión de código de solicitud de material detectada. Reintentando (${attempts}/${maxAttempts})...`);
          continue;
        }
        throw error;
      }
    }

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
          title: `📦 Nueva Solicitud de Materiales (${request.code})`,
          message: `El usuario ${request.requestedBy.name || request.requestedBy.email} ha enviado una solicitud (${itemCountText}) para el proyecto "${request.projectName}".`,
          link: `/solicitudes?highlight=${request.id}`,
        },
      });

      // Do NOT send notification email to the person creating the request
      if (user.email && user.id !== requestedById) {
        this.mailService
          .sendMaterialRequestEmail(
            user.email,
            request.code,
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
    const list = await this.prisma.materialRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: true } },
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        van: true,
      },
    });

    return list.map((r) => ({
      ...r,
      hasPhoto: Boolean(r.photoUrl),
      hasAttachment: Boolean(r.attachmentUrl),
      photoUrl: r.photoUrl ? (r.photoUrl.length > 200 ? 'HAS_PHOTO' : r.photoUrl) : null,
      attachmentUrl: r.attachmentUrl ? (r.attachmentUrl.length > 200 ? 'HAS_ATTACHMENT' : r.attachmentUrl) : null,
    }));
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

    // Handle item removals if specified
    if (dto.removedItemIds && dto.removedItemIds.length > 0) {
      await this.prisma.materialRequestItem.deleteMany({
        where: {
          id: { in: dto.removedItemIds },
          materialRequestId: id,
        },
      });
    }

    // Process new items added directly during dispatch
    for (const itemDto of dto.items) {
      if (!itemDto.itemId && itemDto.productId) {
        const prod = await this.prisma.product.findUnique({ where: { id: itemDto.productId } });
        if (prod) {
          const newItem = await this.prisma.materialRequestItem.create({
            data: {
              materialRequestId: id,
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              requestedQuantity: itemDto.deliveredQuantity || 1,
              deliveredQuantity: itemDto.deliveredQuantity || 1,
              unitMeasure: itemDto.unitMeasure || prod.unit || 'UN',
              serialNumber: itemDto.serialNumber || prod.serialNumber || null,
              isChecked: itemDto.isChecked,
            },
          });
          itemDto.itemId = newItem.id;
        }
      }
    }

    // Refresh request items after additions/removals
    const currentItems = await this.prisma.materialRequestItem.findMany({
      where: { materialRequestId: id },
      include: { product: true },
    });

    // Pre-validate stock sufficiency for all checked items
    for (const itemDto of dto.items) {
      if (!itemDto.isChecked) continue;
      const dbItem = currentItems.find((i) => i.id === itemDto.itemId);
      const prodId = dbItem?.productId || itemDto.productId;
      if (!prodId) continue;

      const deliveredQty = itemDto.deliveredQuantity || (dbItem ? dbItem.requestedQuantity : 1);
      if (deliveredQty > 0) {
        const prod = await this.prisma.product.findUnique({ where: { id: prodId } });
        if (prod && prod.stock < deliveredQty) {
          throw new BadRequestException(
            `Stock insuficiente en Bodega para "${prod.name}". Disponible: ${prod.stock}, Solicitado: ${deliveredQty}`,
          );
        }
      }
    }

    // Process items, update stock & assign to Van if vanId selected
    for (const itemDto of dto.items) {
      if (!itemDto.itemId) continue;
      const dbItem = currentItems.find((i) => i.id === itemDto.itemId);
      if (!dbItem) continue;

      const deliveredQty = itemDto.isChecked ? itemDto.deliveredQuantity || dbItem.requestedQuantity : 0;

      await this.prisma.materialRequestItem.update({
        where: { id: itemDto.itemId },
        data: {
          isChecked: itemDto.isChecked,
          deliveredQuantity: deliveredQty,
          ...(itemDto.serialNumber ? { serialNumber: itemDto.serialNumber } : {}),
        },
      });

      if (itemDto.isChecked && deliveredQty > 0 && dbItem.productId) {
        // Create movement entry (EXIT / SALIDA)
        const targetProject = request.projectName || request.projectId || 'Proyecto General';
        await this.prisma.movement.create({
          data: {
            productId: dbItem.productId,
            projectId: targetProject,
            type: 'EXIT',
            quantity: deliveredQty,
            notes: `Despacho de Solicitud ${request.code} entregado a: ${dto.recipientName}${vanObj ? ` (Camioneta: ${vanObj.plate} - ${vanObj.name})` : ''}${itemDto.serialNumber ? ` [Serie: ${itemDto.serialNumber}]` : ''}`,
            userId: bodegueroUserId,
          },
        });

        // Decrement product stock
        await this.prisma.product.update({
          where: { id: dbItem.productId },
          data: {
            stock: { decrement: deliveredQty },
            ...(itemDto.serialNumber && !dbItem.product?.serialNumber ? { serialNumber: itemDto.serialNumber } : {}),
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
                ...(itemDto.serialNumber ? { serialNumber: itemDto.serialNumber } : {}),
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
                serialNumber: itemDto.serialNumber || dbItem.product.serialNumber || null,
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

  async reject(id: string, user: any, reason?: string) {
    const request = await this.findOne(id);
    if (request.status === 'DISPATCHED') {
      throw new BadRequestException('No se puede rechazar una solicitud que ya fue despachada');
    }

    const updated = await this.prisma.materialRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: reason ? `${request.notes || ''}\n[Rechazada por ${user?.name || user?.email}]: ${reason}` : request.notes,
      },
      include: {
        items: { include: { product: true } },
        requestedBy: true,
        assignedTo: true,
        van: true,
      },
    });

    await this.prisma.appNotification.create({
      data: {
        userId: request.requestedById,
        title: `🚫 Solicitud Rechazada (${request.code})`,
        message: `La solicitud de materiales para "${request.projectName}" fue rechazada/cancelada.`,
        link: `/solicitudes?highlight=${request.id}`,
      },
    });

    return updated;
  }

  async remove(id: string) {
    const request = await this.findOne(id);

    await this.prisma.materialRequestItem.deleteMany({
      where: { materialRequestId: id },
    });

    return this.prisma.materialRequest.delete({
      where: { id },
    });
  }
}

