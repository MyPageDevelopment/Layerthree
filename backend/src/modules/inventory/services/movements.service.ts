import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMovementDto } from '../dto/create-movement.dto';
import { CreateBulkMovementDto } from '../dto/create-bulk-movement.dto';

@Injectable()
export class MovementsService {
  constructor(private prisma: PrismaService) {}

  async create(createMovementDto: CreateMovementDto, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: createMovementDto.productId },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (createMovementDto.type === 'EXIT') {
      if (product.stock < createMovementDto.quantity) {
        throw new BadRequestException(
          `Stock insuficiente. Disponible: ${product.stock}, Solicitado: ${createMovementDto.quantity}`,
        );
      }
    }

    let updatedNotes = createMovementDto.notes || '';
    if (createMovementDto.vanId) {
      const van = await this.prisma.van.findUnique({
        where: { id: createMovementDto.vanId },
      });

      if (van) {
        const actionLabel = createMovementDto.type === 'EXIT' ? 'Asignado a' : 'Devuelto desde';
        updatedNotes = `${updatedNotes} [${actionLabel} Vehículo: ${van.plate} - ${van.name}]`.trim();

        const existingVanItem = await this.prisma.vanItem.findFirst({
          where: {
            vanId: van.id,
            OR: [{ productId: product.id }, { name: product.name }],
          },
        });

        if (createMovementDto.type === 'EXIT') {
          if (existingVanItem) {
            await this.prisma.vanItem.update({
              where: { id: existingVanItem.id },
              data: { quantity: { increment: createMovementDto.quantity } },
            });
          } else {
            await this.prisma.vanItem.create({
              data: {
                vanId: van.id,
                productId: product.id,
                name: product.name,
                category: product.category,
                quantity: createMovementDto.quantity,
                minQuantity: product.minStock || 1,
              },
            });
          }
        } else if (createMovementDto.type === 'ENTRY') {
          if (existingVanItem) {
            const newQty = Math.max(0, existingVanItem.quantity - createMovementDto.quantity);
            await this.prisma.vanItem.update({
              where: { id: existingVanItem.id },
              data: { quantity: newQty },
            });
          }
        }
      }
    }

    const { vanId, ...movementData } = createMovementDto;

    const [movement] = await this.prisma.$transaction([
      this.prisma.movement.create({
        data: {
          ...movementData,
          notes: updatedNotes,
          userId,
        },
        include: {
          product: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.product.update({
        where: { id: createMovementDto.productId },
        data: {
          stock: {
            [createMovementDto.type === 'ENTRY' ? 'increment' : 'decrement']:
              createMovementDto.quantity,
          },
        },
      }),
    ]);

    return movement;
  }

  async findAll(limit?: number) {
    return this.prisma.movement.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.movement.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  async findByProject(projectId: string) {
    return this.prisma.movement.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });
  }

  async createBulk(createBulkMovementDto: CreateBulkMovementDto, userId: string) {
    const productIds = createBulkMovementDto.items.map(item => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException('Uno o más productos no fueron encontrados');
    }

    if (createBulkMovementDto.type === 'EXIT') {
      const insufficientStock = createBulkMovementDto.items.filter(item => {
        const product = products.find(p => p.id === item.productId);
        return product && product.stock < item.quantity;
      });

      if (insufficientStock.length > 0) {
        const errorProducts = insufficientStock.map(item => {
          const product = products.find(p => p.id === item.productId);
          return `${product?.name} (Disponible: ${product?.stock}, Solicitado: ${item.quantity})`;
        }).join(', ');
        
        throw new BadRequestException(
          `Stock insuficiente en: ${errorProducts}`,
        );
      }
    }

    const movements = await this.prisma.$transaction(
      createBulkMovementDto.items.flatMap(item => [
        this.prisma.movement.create({
          data: {
            productId: item.productId,
            projectId: createBulkMovementDto.projectId,
            type: createBulkMovementDto.type,
            quantity: item.quantity,
            notes: createBulkMovementDto.notes,
            userId,
          },
        }),
        this.prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              [createBulkMovementDto.type === 'ENTRY' ? 'increment' : 'decrement']:
                item.quantity,
            },
          },
        }),
      ])
    );

    return movements.filter((_, index) => index % 2 === 0);
  }
}
