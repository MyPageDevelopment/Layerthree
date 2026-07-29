import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProductAuditService } from './product-audit.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private auditService: ProductAuditService,
  ) {}

  async create(createProductDto: CreateProductDto, user?: any) {
    const existingProduct = await this.prisma.product.findUnique({
      where: { sku: createProductDto.sku },
    });

    if (existingProduct) {
      throw new ConflictException('Ya existe un producto con ese SKU');
    }

    const product = await this.prisma.product.create({
      data: createProductDto,
    });

    if (user) {
      await this.auditService.createAuditLog({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        action: 'CREATE',
        userId: user.id || user.userId,
        userName: user.name || user.email,
        userEmail: user.email,
        userRole: user.role,
        changes: createProductDto,
      });
    }

    return product;
  }

  async findAll() {
    return this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        movements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, user?: any) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingSku = await this.prisma.product.findUnique({
        where: { sku: updateProductDto.sku },
      });

      if (existingSku) {
        throw new ConflictException('Ya existe un producto con ese SKU');
      }
    }

    const changes: any = {};
    Object.keys(updateProductDto).forEach((key) => {
      if (product[key] !== updateProductDto[key]) {
        changes[key] = {
          old: product[key],
          new: updateProductDto[key],
        };
      }
    });

    const updatedProduct = await this.prisma.product.update({
      where: { id },
      data: updateProductDto,
    });

    if (user && Object.keys(changes).length > 0) {
      await this.auditService.createAuditLog({
        productId: updatedProduct.id,
        productSku: updatedProduct.sku,
        productName: updatedProduct.name,
        action: 'UPDATE',
        userId: user.id || user.userId,
        userName: user.name || user.email,
        userEmail: user.email,
        userRole: user.role,
        changes,
      });
    }

    return updatedProduct;
  }

  async remove(id: string, user?: any) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (user) {
      await this.auditService.createAuditLog({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        action: 'DELETE',
        userId: user.id || user.userId,
        userName: user.name || user.email,
        userEmail: user.email,
        userRole: user.role,
        changes: { deletedProduct: product },
      });
    }

    return this.prisma.product.delete({
      where: { id },
    });
  }

  async getLowStock() {
    return this.prisma.$queryRaw`
      SELECT * FROM products 
      WHERE stock <= minStock
      ORDER BY (minStock - stock) DESC, name ASC
    `;
  }
}
