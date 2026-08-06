import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVanDto } from './dto/create-van.dto';
import { AddVanItemDto } from './dto/add-van-item.dto';

@Injectable()
export class VansService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const vans = await this.prisma.van.findMany({
      orderBy: { plate: 'asc' },
      include: {
        items: true,
      },
    });

    return vans.map((v) => {
      const totalItems = v.items.reduce((sum, item) => sum + item.quantity, 0);
      const toolsCount = v.items.filter((i) => i.type === 'HERRAMIENTA').length;
      const materialsCount = v.items.filter((i) => i.type === 'MATERIAL').length;
      return {
        ...v,
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

    // If linking to a warehouse product and deductFromWarehouse is requested
    if (dto.productId && dto.deductFromWarehouse && dto.quantity > 0) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
      });
      if (product) {
        const uId = user?.id || user?.userId;
        const newStock = Math.max(0, product.stock - dto.quantity);
        await this.prisma.product.update({
          where: { id: product.id },
          data: { stock: newStock },
        });

        if (uId) {
          await this.prisma.movement.create({
            data: {
              productId: product.id,
              type: 'EXIT',
              quantity: dto.quantity,
              notes: `🚚 Asignación a camioneta (${van.plate} - ${van.name}) por ${user.name || user.email}`,
              userId: uId,
            },
          });
        }
      }
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

  async updateItem(vanId: string, itemId: string, quantity: number, user?: any) {
    const item = await this.prisma.vanItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.vanId !== vanId) {
      throw new NotFoundException('Ítem no encontrado en esta camioneta');
    }

    return this.prisma.vanItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  async removeItem(vanId: string, itemId: string) {
    const item = await this.prisma.vanItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.vanId !== vanId) {
      throw new NotFoundException('Ítem no encontrado en esta camioneta');
    }

    return this.prisma.vanItem.delete({
      where: { id: itemId },
    });
  }
}
