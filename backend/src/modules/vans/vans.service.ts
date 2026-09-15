import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVanDto } from './dto/create-van.dto';
import { AddVanItemDto } from './dto/add-van-item.dto';
import { CreateVanMaintenanceDto } from './dto/create-van-maintenance.dto';

export function parseDateToNoon(dateInput?: string | Date | null): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null;
    return dateInput;
  }
  const s = String(dateInput).trim();
  if (!s) return null;

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.test(s)) {
    const match = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      return new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00.000Z`);
    }
  }

  // YYYY-MM-DD
  if (/^(\d{4})-(\d{2})-(\d{2})/.test(s)) {
    const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, y, m, d] = match;
      return new Date(`${y}-${m}-${d}T12:00:00.000Z`);
    }
  }

  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt;
}

export function determineItemType(
  product?: { category?: string | null; subcategory?: string | null; name?: string | null } | null,
  fallbackType: string = 'MATERIAL',
): 'HERRAMIENTA' | 'MATERIAL' {
  if (!product) {
    const fallbackLower = (fallbackType || '').toLowerCase();
    return fallbackLower.includes('herramienta') ? 'HERRAMIENTA' : 'MATERIAL';
  }

  const subcat = (product.subcategory || '').toLowerCase().trim();
  const name = (product.name || '').toLowerCase().trim();

  // 1. Subcategory checks: Only classify as HERRAMIENTA if subcategory contains 'herramienta'
  if (subcat.includes('herramienta')) {
    return 'HERRAMIENTA';
  }

  // 2. Name checks for explicit tools
  if (
    name.includes('fusionadora') ||
    name.includes('empalmadora') ||
    name.includes('taladro') ||
    name.includes('multimetro') ||
    name.includes('multímetro') ||
    name.includes('otdr') ||
    name.includes('certificador') ||
    name.includes('cleaver') ||
    name.includes('peladora') ||
    name.includes('prensaterminal') ||
    name.includes('cortadora') ||
    name.includes('escalera')
  ) {
    if (!subcat.includes('insumo') && !subcat.includes('material')) {
      return 'HERRAMIENTA';
    }
  }

  const fallbackLower = (fallbackType || '').toLowerCase();
  return fallbackLower.includes('herramienta') ? 'HERRAMIENTA' : 'MATERIAL';
}

@Injectable()
export class VansService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    // Delete any orphaned zero-quantity items from database
    await this.prisma.vanItem.deleteMany({
      where: { quantity: { lte: 0 } },
    }).catch(() => {});

    const vans = await this.prisma.van.findMany({
      orderBy: { plate: 'asc' },
      include: {
        items: {
          where: { quantity: { gt: 0 } },
          include: { product: true },
        },
        maintenances: {
          orderBy: { date: 'desc' },
        },
        eppDeliveries: {
          orderBy: { deliveryDate: 'desc' },
        },
      },
    });

    return vans.map((v) => {
      const activeItems = v.items
        .filter((i) => i.quantity > 0)
        .map((i) => {
          const computedType = determineItemType(i.product, i.type);
          if (i.type !== computedType) {
            this.prisma.vanItem.update({ where: { id: i.id }, data: { type: computedType } }).catch(() => {});
            return { ...i, type: computedType };
          }
          return i;
        });

      const totalItems = activeItems.reduce((sum, item) => sum + item.quantity, 0);
      const toolsCount = activeItems.filter((i) => i.type === 'HERRAMIENTA').length;
      const materialsCount = activeItems.filter((i) => i.type === 'MATERIAL').length;
      const totalMaintenanceCost = (v.maintenances || []).reduce((sum, m) => sum + (m.cost || 0), 0);
      const maintenancesCount = (v.maintenances || []).length;
      const eppDeliveriesCount = (v.eppDeliveries || []).length;
      const lastEppDate = v.eppDeliveries?.[0]?.deliveryDate || null;

      return {
        ...v,
        items: activeItems,
        totalItems,
        toolsCount,
        materialsCount,
        totalMaintenanceCost,
        maintenancesCount,
        eppDeliveriesCount,
        lastEppDate,
      };
    });
  }

  async findOne(id: string) {
    const van = await this.prisma.van.findUnique({
      where: { id },
      include: {
        items: {
          where: { quantity: { gt: 0 } },
          include: { product: true },
          orderBy: { name: 'asc' },
        },
        maintenances: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!van) {
      throw new NotFoundException('Camioneta no encontrada');
    }

    const items = van.items.map((i) => {
      const computedType = determineItemType(i.product, i.type);
      if (i.type !== computedType) {
        this.prisma.vanItem.update({ where: { id: i.id }, data: { type: computedType } }).catch(() => {});
        return { ...i, type: computedType };
      }
      return i;
    });

    const totalMaintenanceCost = (van.maintenances || []).reduce((sum, m) => sum + (m.cost || 0), 0);
    const maintenancesCount = (van.maintenances || []).length;

    return {
      ...van,
      items,
      totalMaintenanceCost,
      maintenancesCount,
    };
  }

  async create(dto: CreateVanDto) {
    const existing = await this.prisma.van.findUnique({
      where: { plate: dto.plate.trim().toUpperCase() },
    });

    if (existing) {
      throw new ConflictException('Ya existe una camioneta con esa patente');
    }

    return this.prisma.van.create({
      data: {
        plate: dto.plate.trim().toUpperCase(),
        name: dto.name,
        driver: dto.driver || null,
        status: dto.status || 'EN_TERRENO',
        notes: dto.notes || null,
        mileage: dto.mileage !== undefined ? Number(dto.mileage) : 0,
        lastOilChangeKm: dto.lastOilChangeKm !== undefined ? Number(dto.lastOilChangeKm) : null,
        nextOilChangeKm: dto.nextOilChangeKm !== undefined ? Number(dto.nextOilChangeKm) : null,
        lastOilChangeDate: parseDateToNoon(dto.lastOilChangeDate),
        lastTireChangeDate: parseDateToNoon(dto.lastTireChangeDate),
        technicalReviewDate: parseDateToNoon(dto.technicalReviewDate),
        insuranceExpiryDate: parseDateToNoon(dto.insuranceExpiryDate),
        permisoCirculacionDate: parseDateToNoon(dto.permisoCirculacionDate),
      },
    });
  }

  async update(id: string, dto: Partial<CreateVanDto>) {
    await this.findOne(id);

    if (dto.plate) {
      const plateUpper = dto.plate.trim().toUpperCase();
      const existing = await this.prisma.van.findUnique({
        where: { plate: plateUpper },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe otra camioneta con esa patente');
      }
      dto.plate = plateUpper;
    }

    const updateData: any = { ...dto };
    if (dto.mileage !== undefined) updateData.mileage = Number(dto.mileage);
    if (dto.lastOilChangeKm !== undefined) updateData.lastOilChangeKm = dto.lastOilChangeKm ? Number(dto.lastOilChangeKm) : null;
    if (dto.nextOilChangeKm !== undefined) updateData.nextOilChangeKm = dto.nextOilChangeKm ? Number(dto.nextOilChangeKm) : null;
    if (dto.lastOilChangeDate !== undefined) updateData.lastOilChangeDate = parseDateToNoon(dto.lastOilChangeDate);
    if (dto.lastTireChangeDate !== undefined) updateData.lastTireChangeDate = parseDateToNoon(dto.lastTireChangeDate);
    if (dto.technicalReviewDate !== undefined) updateData.technicalReviewDate = parseDateToNoon(dto.technicalReviewDate);
    if (dto.insuranceExpiryDate !== undefined) updateData.insuranceExpiryDate = parseDateToNoon(dto.insuranceExpiryDate);
    if (dto.permisoCirculacionDate !== undefined) updateData.permisoCirculacionDate = parseDateToNoon(dto.permisoCirculacionDate);

    return this.prisma.van.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.van.delete({
      where: { id },
    });
  }

  /* ============================================================
     HISTORIAL DE MANTENCIONES DE VEHÍCULOS
     ============================================================ */

  async getMaintenances(vanId: string) {
    await this.findOne(vanId);
    return this.prisma.vanMaintenance.findMany({
      where: { vanId },
      orderBy: { date: 'desc' },
    });
  }

  async getAllMaintenancesSummary() {
    const maintenances = await this.prisma.vanMaintenance.findMany({
      orderBy: { date: 'desc' },
      include: {
        van: {
          select: { id: true, plate: true, name: true, driver: true, status: true },
        },
      },
    });

    const totalCost = maintenances.reduce((sum, m) => sum + (m.cost || 0), 0);
    const totalCount = maintenances.length;

    return {
      maintenances,
      totalCost,
      totalCount,
    };
  }

  async addMaintenance(vanId: string, dto: CreateVanMaintenanceDto, user?: any) {
    await this.findOne(vanId);
    const parsedDate = parseDateToNoon(dto.date);
    if (!parsedDate) {
      throw new BadRequestException('Fecha de mantención inválida');
    }

    const userName = user ? (user.name || user.email) : undefined;
    const maintenance = await this.prisma.vanMaintenance.create({
      data: {
        vanId,
        date: parsedDate,
        mileage: dto.mileage !== undefined && dto.mileage !== null ? Number(dto.mileage) : null,
        type: dto.type || 'PREVENTIVA',
        title: dto.title,
        description: dto.description,
        cost: dto.cost !== undefined && dto.cost !== null ? Number(dto.cost) : 0,
        workshop: dto.workshop || null,
        invoiceNumber: dto.invoiceNumber || null,
        imageUrl: dto.imageUrl || null,
        imageName: dto.imageName || null,
        imagesJson: dto.imagesJson || null,
        performedBy: dto.performedBy || userName || null,
      },
    });

    // Automatically update van technical attributes if requested or based on type
    const vanUpdateData: any = {};
    if (dto.updateVanMileage && dto.mileage) {
      vanUpdateData.mileage = Number(dto.mileage);
    }
    if (dto.updateVanOil || dto.type === 'CAMBIO_ACEITE') {
      vanUpdateData.lastOilChangeDate = parsedDate;
      if (dto.mileage) vanUpdateData.lastOilChangeKm = Number(dto.mileage);
      if (dto.nextOilChangeKm) vanUpdateData.nextOilChangeKm = Number(dto.nextOilChangeKm);
    }
    if (dto.updateVanTires || dto.type === 'NEUMATICOS') {
      vanUpdateData.lastTireChangeDate = parsedDate;
    }

    if (Object.keys(vanUpdateData).length > 0) {
      await this.prisma.van.update({
        where: { id: vanId },
        data: vanUpdateData,
      });
    }

    return maintenance;
  }

  async updateMaintenance(vanId: string, maintenanceId: string, dto: Partial<CreateVanMaintenanceDto>) {
    const existing = await this.prisma.vanMaintenance.findFirst({
      where: { id: maintenanceId, vanId },
    });

    if (!existing) {
      throw new NotFoundException('Registro de mantención no encontrado para esta camioneta');
    }

    const data: any = { ...dto };
    delete data.updateVanMileage;
    delete data.updateVanOil;
    delete data.updateVanTires;
    delete data.nextOilChangeKm;

    if (dto.date !== undefined) {
      const parsedDate = parseDateToNoon(dto.date);
      if (!parsedDate) throw new BadRequestException('Fecha de mantención inválida');
      data.date = parsedDate;
    }
    if (dto.mileage !== undefined) data.mileage = dto.mileage !== null ? Number(dto.mileage) : null;
    if (dto.cost !== undefined) data.cost = dto.cost !== null ? Number(dto.cost) : 0;

    return this.prisma.vanMaintenance.update({
      where: { id: maintenanceId },
      data,
    });
  }

  async deleteMaintenance(vanId: string, maintenanceId: string) {
    const existing = await this.prisma.vanMaintenance.findFirst({
      where: { id: maintenanceId, vanId },
    });

    if (!existing) {
      throw new NotFoundException('Registro de mantención no encontrado para esta camioneta');
    }

    return this.prisma.vanMaintenance.delete({
      where: { id: maintenanceId },
    });
  }

  /* ============================================================
     GESTIÓN DE HERRAMIENTAS Y MATERIALES (STOCK CAMIONETAS)
     ============================================================ */

  async addItem(vanId: string, dto: AddVanItemDto, user?: any) {
    const van = await this.findOne(vanId);

    const shouldDeduct = dto.productId ? (dto.deductFromWarehouse ?? true) : false;
    const uId = user?.id || user?.userId;
    const userName = user ? (user.name || user.email) : 'Sistema';

    if (dto.productId && shouldDeduct && dto.quantity > 0) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
      });

      if (!product) {
        throw new NotFoundException('Producto de inventario no encontrado');
      }

      if (product.stock < dto.quantity) {
        throw new BadRequestException(
          `Stock insuficiente en Bodega para "${product.name}". Disponible: ${product.stock}, Solicitado: ${dto.quantity}`,
        );
      }

      await this.prisma.product.update({
        where: { id: product.id },
        data: { stock: { decrement: dto.quantity } },
      });

      if (uId) {
        await this.prisma.movement.create({
          data: {
            productId: product.id,
            type: 'EXIT',
            quantity: dto.quantity,
            notes: `🚚 Asignación a camioneta (${van.plate} - ${van.name}) por ${userName}`,
            userId: uId,
          },
        });
      }
    }

    // Consolidation check: if item already exists in this van (by productId or exact name)
    const existingVanItem = await this.prisma.vanItem.findFirst({
      where: {
        vanId,
        OR: [
          ...(dto.productId ? [{ productId: dto.productId }] : []),
          { name: dto.name },
        ],
      },
    });

    let itemProd: any = null;
    if (dto.productId) {
      itemProd = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    }
    const computedType = determineItemType(itemProd, dto.type || 'MATERIAL');

    if (existingVanItem) {
      return this.prisma.vanItem.update({
        where: { id: existingVanItem.id },
        data: {
          quantity: existingVanItem.quantity + dto.quantity,
          type: computedType,
          assignedTo: dto.assignedTo || existingVanItem.assignedTo || van.driver || null,
        },
      });
    }

    return this.prisma.vanItem.create({
      data: {
        vanId,
        productId: dto.productId || null,
        name: dto.name,
        sku: dto.sku || null,
        category: dto.category || 'EQUIPOS',
        type: computedType,
        quantity: dto.quantity,
        minQuantity: dto.minQuantity || 1,
        assignedTo: dto.assignedTo || van.driver || null,
      },
    });
  }

  async updateItem(vanId: string, itemId: string, newQuantity: number, user?: any) {
    const item = await this.prisma.vanItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.vanId !== vanId) {
      throw new NotFoundException('Ítem no encontrado en esta camioneta');
    }

    const van = await this.prisma.van.findUnique({ where: { id: vanId } });
    const delta = newQuantity - item.quantity;
    const uId = user?.id || user?.userId;
    const userName = user ? (user.name || user.email) : 'Sistema';

    if (delta !== 0 && item.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (product) {
        if (delta > 0) {
          // Increase stock in van => deduct from warehouse
          if (product.stock < delta) {
            throw new BadRequestException(
              `Stock insuficiente en Bodega para aumentar "${product.name}". Disponible: ${product.stock}, Requerido adicional: ${delta}`,
            );
          }

          await this.prisma.product.update({
            where: { id: product.id },
            data: { stock: { decrement: delta } },
          });

          if (uId) {
            await this.prisma.movement.create({
              data: {
                productId: product.id,
                type: 'EXIT',
                quantity: delta,
                notes: `🚚 Ajuste (+${delta}) en camioneta (${van?.plate || vanId}) por ${userName}`,
                userId: uId,
              },
            });
          }
        } else {
          // Decrease stock in van => return to warehouse
          const returnQty = Math.abs(delta);

          await this.prisma.product.update({
            where: { id: product.id },
            data: { stock: { increment: returnQty } },
          });

          if (uId) {
            await this.prisma.movement.create({
              data: {
                productId: product.id,
                type: 'ENTRY',
                quantity: returnQty,
                notes: `📥 Devolución (-${returnQty}) a Bodega desde camioneta (${van?.plate || vanId}) por ${userName}`,
                userId: uId,
              },
            });
          }
        }
      }
    }

    if (newQuantity <= 0) {
      return this.prisma.vanItem.delete({
        where: { id: itemId },
      });
    }

    return this.prisma.vanItem.update({
      where: { id: itemId },
      data: { quantity: newQuantity },
    });
  }

  async removeItem(
    vanId: string,
    itemId: string,
    dto?: { quantity?: number; returnToWarehouse?: boolean; notes?: string },
    user?: any,
  ) {
    const item = await this.prisma.vanItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.vanId !== vanId) {
      throw new NotFoundException('Ítem no encontrado en esta camioneta');
    }

    const van = await this.prisma.van.findUnique({ where: { id: vanId } });
    const uId = user?.id || user?.userId;
    const userName = user ? (user.name || user.email) : 'Sistema';

    const returnToWarehouse = dto?.returnToWarehouse ?? true;
    const qtyToRemove =
      dto?.quantity && dto.quantity > 0 ? Math.min(dto.quantity, item.quantity) : item.quantity;
    const remainingQty = item.quantity - qtyToRemove;

    if (item.productId && qtyToRemove > 0) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (product) {
        if (returnToWarehouse) {
          await this.prisma.product.update({
            where: { id: product.id },
            data: { stock: { increment: qtyToRemove } },
          });

          if (uId) {
            await this.prisma.movement.create({
              data: {
                productId: product.id,
                type: 'ENTRY',
                quantity: qtyToRemove,
                notes:
                  dto?.notes ||
                  `📥 Retiro de ítem (${qtyToRemove} un.) de camioneta (${van?.plate || vanId}) y devolución a Bodega por ${userName}`,
                userId: uId,
              },
            });
          }
        } else {
          // Material ocupado/consumido en terreno (Eliminar de todo)
          if (uId) {
            await this.prisma.movement.create({
              data: {
                productId: product.id,
                type: 'EXIT',
                quantity: qtyToRemove,
                notes:
                  dto?.notes ||
                  `🔥 Material ocupado/consumido en terreno (${qtyToRemove} un.) desde camioneta (${van?.plate || vanId}) por ${userName}`,
                userId: uId,
              },
            });
          }
        }
      }
    }

    if (remainingQty <= 0) {
      return this.prisma.vanItem.delete({
        where: { id: itemId },
      });
    }

    return this.prisma.vanItem.update({
      where: { id: itemId },
      data: { quantity: remainingQty },
    });
  }

  /* ============================================================
     MÉTODOS EPP (ENTREGAS DE ELEMENTOS DE PROTECCIÓN PERSONAL)
     ============================================================ */

  async getEppDeliveries(vanId?: string) {
    return this.prisma.vanEppDelivery.findMany({
      where: vanId ? { vanId } : undefined,
      orderBy: { deliveryDate: 'desc' },
      include: {
        van: {
          select: {
            id: true,
            plate: true,
            name: true,
            driver: true,
          },
        },
      },
    });
  }

  async createEppDelivery(
    vanId: string,
    dto: {
      deliveryDate?: string | Date;
      recipientName: string;
      eppItemsText?: string;
      eppItems?: string;
      documentUrl?: string;
      documentName?: string;
      notes?: string;
    },
    user?: any,
  ) {
    const van = await this.prisma.van.findUnique({ where: { id: vanId } });
    if (!van) {
      throw new NotFoundException('Camioneta no encontrada');
    }

    if (!dto.recipientName || !dto.recipientName.trim()) {
      throw new BadRequestException('Debes indicar el nombre del técnico o persona que recibe los EPP');
    }

    const itemsText = (dto.eppItemsText || (dto as any).eppItems || '').trim();
    if (!itemsText) {
      throw new BadRequestException('Debes indicar o seleccionar los EPP entregados');
    }

    const deliveredBy = user ? (user.name || user.email) : 'Bodega';
    const dateVal = dto.deliveryDate ? new Date(dto.deliveryDate) : new Date();

    return this.prisma.vanEppDelivery.create({
      data: {
        vanId,
        deliveryDate: dateVal,
        recipientName: dto.recipientName.trim(),
        eppItemsText: itemsText,
        documentUrl: dto.documentUrl || null,
        documentName: dto.documentName || null,
        notes: dto.notes ? dto.notes.trim() : null,
        deliveredBy,
      },
      include: {
        van: {
          select: {
            id: true,
            plate: true,
            name: true,
            driver: true,
          },
        },
      },
    });
  }

  async deleteEppDelivery(deliveryId: string) {
    const existing = await this.prisma.vanEppDelivery.findUnique({
      where: { id: deliveryId },
    });
    if (!existing) {
      throw new NotFoundException('Registro de entrega de EPP no encontrado');
    }

    return this.prisma.vanEppDelivery.delete({
      where: { id: deliveryId },
    });
  }
}

