import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVanDto } from './dto/create-van.dto';
import { AddVanItemDto } from './dto/add-van-item.dto';

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
        },
      },
    });

    return vans.map((v) => {
      const activeItems = v.items.filter((i) => i.quantity > 0);
      const totalItems = activeItems.reduce((sum, item) => sum + item.quantity, 0);
      const toolsCount = activeItems.filter((i) => i.type === 'HERRAMIENTA').length;
      const materialsCount = activeItems.filter((i) => i.type === 'MATERIAL').length;
      return {
        ...v,
        items: activeItems,
        totalItems,
        toolsCount,
        materialsCount,
      };
    });
  }

  async findOne(id: string) {
    const van = await this.prisma.van.findUnique({
      where: { id },
      include: {
        items: {
          where: { quantity: { gt: 0 } },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!van) {
      throw new NotFoundException('Camioneta no encontrada');
    }

    return van;
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

    return this.prisma.van.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.van.delete({
      where: { id },
    });
  }

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

    if (existingVanItem) {
      return this.prisma.vanItem.update({
        where: { id: existingVanItem.id },
        data: {
          quantity: existingVanItem.quantity + dto.quantity,
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
        type: dto.type || 'MATERIAL',
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

  async removeItem(vanId: string, itemId: string, user?: any) {
    const item = await this.prisma.vanItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.vanId !== vanId) {
      throw new NotFoundException('Ítem no encontrado en esta camioneta');
    }

    const van = await this.prisma.van.findUnique({ where: { id: vanId } });
    const uId = user?.id || user?.userId;
    const userName = user ? (user.name || user.email) : 'Sistema';

    if (item.productId && item.quantity > 0) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (product) {
        await this.prisma.product.update({
          where: { id: product.id },
          data: { stock: { increment: item.quantity } },
        });

        if (uId) {
          await this.prisma.movement.create({
            data: {
              productId: product.id,
              type: 'ENTRY',
              quantity: item.quantity,
              notes: `📥 Retiro de ítem de camioneta (${van?.plate || vanId}) y devolución a Bodega por ${userName}`,
              userId: uId,
            },
          });
        }
      }
    }

    return this.prisma.vanItem.delete({
      where: { id: itemId },
    });
  }
}
