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

    const [movement] = await this.prisma.$transaction([
      this.prisma.movement.create({
        data: {
          ...createMovementDto,
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
