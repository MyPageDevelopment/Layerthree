import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateRequestItemDto {
  productId: string;
  quantity: number;
}

export interface CreateRequestDto {
  projectId?: string;
  projectName?: string;
  notes?: string;
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
  items: DispatchItemDto[];
}

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService) {}

  async create(requestedById: string, dto: CreateRequestDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Debes incluir al menos un producto en la solicitud');
    }

    const count = await this.prisma.materialRequest.count();
    const code = `REQ-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const request = await this.prisma.materialRequest.create({
      data: {
        code,
        projectId: dto.projectId || null,
        projectName: dto.projectName || 'Proyecto General',
        requestedById,
        notes: dto.notes || '',
        status: 'PENDING',
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            requestedQuantity: i.quantity,
            deliveredQuantity: 0,
            isChecked: false,
          })),
        },
      },
      include: {
        items: {
          include: { product: true },
        },
        requestedBy: true,
      },
    });

    // Notify all Bodegueros and SuperAdmins
    const targetUsers = await this.prisma.user.findMany({
      where: {
        role: { in: ['BODEGUERO', 'SUPER_ADMIN'] },
        isActive: true,
      },
    });

    for (const user of targetUsers) {
      await this.prisma.appNotification.create({
        data: {
          userId: user.id,
          title: `📦 Nueva Solicitud de Materiales (${code})`,
          message: `El usuario ${request.requestedBy.name || request.requestedBy.email} ha solicitado ${dto.items.length} ítems para el proyecto "${request.projectName}".`,
          link: `/solicitudes?highlight=${request.id}`,
        },
      });
    }

    return request;
  }

  async findAll(userId: string, userRole: string) {
    if (userRole === 'SUPER_ADMIN' || userRole === 'BODEGUERO' || userRole === 'GERENTE') {
      return this.prisma.materialRequest.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          items: { include: { product: true } },
          requestedBy: true,
        },
      });
    }

    return this.prisma.materialRequest.findMany({
      where: { requestedById: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: true } },
        requestedBy: true,
      },
    });
  }

  async findOne(id: string) {
    const request = await this.prisma.materialRequest.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        requestedBy: true,
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

    if (!dto.photoUrl || dto.photoUrl.trim() === '') {
      throw new BadRequestException('Debes adjuntar la fotografía de respaldo de la entrega de materiales');
    }

    // Process items & update stock
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

      if (itemDto.isChecked && deliveredQty > 0) {
        // Create movement entry (EXIT / SALIDA)
        await this.prisma.movement.create({
          data: {
            productId: dbItem.productId,
            projectId: request.projectId || null,
            type: 'EXIT',
            quantity: deliveredQty,
            notes: `Despacho de Solicitud ${request.code} entregado a: ${dto.recipientName}`,
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
      }
    }

    const updatedRequest = await this.prisma.materialRequest.update({
      where: { id },
      data: {
        status: 'DISPATCHED',
        assignedToId: bodegueroUserId,
        recipientName: dto.recipientName,
        photoUrl: dto.photoUrl,
        notes: dto.notes ? `${request.notes || ''}\n[Despacho]: ${dto.notes}` : request.notes,
      },
      include: {
        items: { include: { product: true } },
        requestedBy: true,
      },
    });

    // Notify project requester & Gerentes
    const notificationUsers = await this.prisma.user.findMany({
      where: {
        OR: [
          { id: request.requestedById },
          { role: 'GERENTE' },
        ],
        isActive: true,
      },
    });

    for (const u of notificationUsers) {
      await this.prisma.appNotification.create({
        data: {
          userId: u.id,
          title: `✅ Solicitud Entregada (${request.code})`,
          message: `Los materiales del proyecto "${request.projectName}" fueron despachados y entregados a: ${dto.recipientName}. (Foto de respaldo adjunta).`,
          link: `/solicitudes?highlight=${request.id}`,
        },
      });
    }

    return updatedRequest;
  }
}
