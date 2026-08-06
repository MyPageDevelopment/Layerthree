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

    const isUtp =
      (createProductDto.name && createProductDto.name.toUpperCase().includes('UTP')) ||
      (createProductDto.sku && createProductDto.sku.toUpperCase().includes('UTP'));

    const unit = isUtp ? 'MTS' : (createProductDto.unit || 'UN').toUpperCase().trim();
    const unitCost = createProductDto.unitCost ?? createProductDto.unitPrice ?? 0;
    const stock = createProductDto.stock ?? 0;
    const totalCost = stock * unitCost;
    const listPrice = createProductDto.listPrice ?? 0;
    const unitPrice = createProductDto.unitPrice ?? unitCost;

    const product = await this.prisma.product.create({
      data: {
        ...createProductDto,
        unit,
        unitCost,
        totalCost,
        listPrice,
        unitPrice,
      },
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
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, isDeleted: false },
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
    const product = await this.prisma.product.findFirst({ where: { id, isDeleted: false } });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingSku = await this.prisma.product.findFirst({
        where: { sku: updateProductDto.sku, isDeleted: false },
      });

      if (existingSku) {
        throw new ConflictException('Ya existe un producto con ese SKU');
      }
    }

    const isUtp =
      (updateProductDto.name || product.name).toUpperCase().includes('UTP') ||
      (updateProductDto.sku || product.sku).toUpperCase().includes('UTP');

    const newUnit = isUtp
      ? 'MTS'
      : updateProductDto.unit
      ? updateProductDto.unit.toUpperCase().trim()
      : product.unit;

    const newStock = updateProductDto.stock !== undefined ? updateProductDto.stock : product.stock;
    const newUnitCost = updateProductDto.unitCost !== undefined ? updateProductDto.unitCost : (updateProductDto.unitPrice !== undefined ? updateProductDto.unitPrice : product.unitCost);
    const newTotalCost = newStock * newUnitCost;
    const newUnitPrice = updateProductDto.unitPrice !== undefined ? updateProductDto.unitPrice : (newUnitCost > 0 ? newUnitCost : product.unitPrice);

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
      data: {
        ...updateProductDto,
        unit: newUnit,
        unitCost: newUnitCost,
        totalCost: newTotalCost,
        unitPrice: newUnitPrice,
      },
    });

    // Trace stock change as a Movement
    if (updateProductDto.stock !== undefined && updateProductDto.stock !== product.stock && user) {
      const diff = updateProductDto.stock - product.stock;
      const uId = user.id || user.userId;
      if (uId) {
        await this.prisma.movement.create({
          data: {
            productId: updatedProduct.id,
            type: diff > 0 ? 'ENTRY' : 'EXIT',
            quantity: Math.abs(diff),
            notes: `Ajuste manual de stock por ${user.name || user.email} (${diff > 0 ? '+' : ''}${diff})`,
            userId: uId,
          },
        });
      }
    }

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
    const product = await this.prisma.product.findFirst({ where: { id, isDeleted: false } });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    const uId = user?.id || user?.userId;
    const userDisplay = user ? `${user.name || user.email} (${user.role || 'USUARIO'})` : 'SISTEMA';

    if (uId) {
      // Record EXIT movement before soft deletion
      await this.prisma.movement.create({
        data: {
          productId: product.id,
          type: 'EXIT',
          quantity: product.stock > 0 ? product.stock : 1,
          notes: `⚠️ [ELIMINACIÓN DE PRODUCTO] Producto dado de baja del inventario por ${userDisplay}. (Stock al eliminar: ${product.stock})`,
          userId: uId,
        },
      });
    }

    if (user) {
      await this.auditService.createAuditLog({
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        action: 'DELETE',
        userId: uId || 'SYSTEM',
        userName: user.name || user.email,
        userEmail: user.email,
        userRole: user.role,
        changes: { deletedProduct: product, deletedBy: userDisplay },
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        stock: 0,
      },
    });
  }

  async getLowStock() {
    return this.prisma.$queryRaw`
      SELECT * FROM products 
      WHERE isDeleted = false AND stock <= minStock
      ORDER BY (minStock - stock) DESC, name ASC
    `;
  }

  async importCsvData(csvText: string, user?: any) {
    const lines = (csvText || '').split(/\r?\n/);
    const parsedItems: any[] = [];

    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const mapCategory = (catName: string): { category: any; subcategory: string } => {
      const upper = (catName || '').toUpperCase().trim();
      if (
        upper.includes('CANALIZACIÓN') ||
        upper.includes('CANALIZACION') ||
        upper.includes('EMT') ||
        upper.includes('PVC') ||
        upper.includes('BPC') ||
        upper.includes('DLP') ||
        upper.includes('CONDUIT')
      ) {
        return { category: 'CANALIZACION', subcategory: catName };
      }
      if (
        upper.includes('ELECTRICIDAD') ||
        upper.includes('ELECTRICO') ||
        upper.includes('ILUMINACIÓN') ||
        upper.includes('ILUMINACION')
      ) {
        return { category: 'ELECTRICIDAD', subcategory: catName };
      }
      if (upper.includes('RED') || upper.includes('REDES') || upper.includes('CABLEADO')) {
        return { category: 'RED', subcategory: catName };
      }
      if (upper.includes('FIBRA') || upper.includes('F.O')) {
        return { category: 'FIBRA_OPTICA', subcategory: catName };
      }
      if (
        upper.includes('EQUIPO') ||
        upper.includes('CLIMATIZACIÓN') ||
        upper.includes('CLIMATIZACION') ||
        upper.includes('HERRAMIENTA') ||
        upper.includes('RACK')
      ) {
        return { category: 'EQUIPOS', subcategory: catName };
      }
      return { category: 'INSUMOS', subcategory: catName };
    };

    let currentCategory: any = 'INSUMOS';
    let currentSubcategory: string | null = null;
    const knownHeaderTexts = ['PRODUCTOS', 'CANTIDAD', 'TIPO', 'PROVEEDOR', 'CLIENTE', 'PLANILLA', 'MAY-25'];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCsvLine(line);
      if (!cols || cols.length === 0) continue;

      // Skip header rows
      if (
        (cols[0] && cols[0].toLowerCase().includes('sku')) ||
        (cols[1] && cols[1].toLowerCase().includes('nombre'))
      ) {
        continue;
      }

      // Check if it's the structured format (inventario_con_costos_y_formulas.csv or similar)
      if (cols.length >= 5 && cols[0] && cols[0].length >= 3 && cols[1] && cols[1].length >= 2) {
        const rawSku = cols[0];
        const rawName = cols[1];
        const rawCategoryStr = cols[2] || '';
        const rawSubcat = cols[3] || '';
        const rawQty = parseFloat(cols[4]) || 0;
        const rawUnitType = (cols[5] || '').toUpperCase().trim();
        const rawUnitCost = parseFloat(cols[6]) || 0;
        const rawListPrice = parseFloat(cols[8]) || 0;
        const rawSupplierCode = cols[10] || null;
        const obs = cols[11] || '';

        const mappedCat = mapCategory(rawCategoryStr);
        const stock = Math.max(0, Math.round(rawQty));
        
        // Enforce UTP cables unit to MTS
        const isUtp = rawName.toUpperCase().includes('UTP') || rawSku.toUpperCase().includes('UTP');
        const unit = isUtp ? 'MTS' : (rawUnitType || 'UN');

        const unitCost = Math.max(0, rawUnitCost);
        const totalCost = stock * unitCost;
        const listPrice = Math.max(0, rawListPrice);
        const unitPrice = unitCost > 0 ? unitCost : listPrice;

        const descParts = [
          obs ? `Obs: ${obs}` : '',
          rawSupplierCode ? `Prov: ${rawSupplierCode}` : '',
        ]
          .filter(Boolean)
          .join(' | ');

        parsedItems.push({
          sku: rawSku,
          name: rawName,
          description: descParts || undefined,
          category: mappedCat.category,
          subcategory: rawSubcat || mappedCat.subcategory,
          stock,
          minStock: 5,
          unit,
          unitCost,
          totalCost,
          listPrice,
          unitPrice,
          supplierCode: rawSupplierCode,
        });
        continue;
      }

      // Legacy layout fallback
      if (cols[1] && cols[1].length > 0) {
        const potentialCat = cols[1].toUpperCase();
        if (!knownHeaderTexts.includes(potentialCat)) {
          const mapped = mapCategory(cols[1]);
          currentCategory = mapped.category;
          currentSubcategory = mapped.subcategory;
        }
      }

      const rawName = cols[2];
      if (!rawName || rawName.length < 2) continue;

      const upperName = rawName.toUpperCase();
      if (knownHeaderTexts.some((h) => upperName.includes(h))) continue;

      const subDetail = cols[3] || '';
      const unitType = (cols[4] || '').toUpperCase().trim();

      let totalStock = 0;
      for (let c = 5; c < cols.length; c++) {
        const val = parseFloat(cols[c]);
        if (!isNaN(val) && val > 0) {
          totalStock += Math.round(val);
        }
      }

      const slug = (rawName + ' ' + subDetail)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 35);
      const sku = `SKU-${slug}-${i}`;

      const fullName = subDetail ? `${rawName} (${subDetail})` : rawName;
      const description = unitType ? `Tipo: ${unitType}` : undefined;
      const isUtp = fullName.toUpperCase().includes('UTP') || sku.toUpperCase().includes('UTP');
      const unit = isUtp ? 'MTS' : (unitType || 'UN');

      parsedItems.push({
        sku,
        name: fullName,
        description,
        category: currentCategory,
        subcategory: currentSubcategory,
        stock: totalStock,
        minStock: 5,
        unit,
        unitCost: 0,
        totalCost: 0,
        listPrice: 0,
        unitPrice: 0,
      });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const userIdToRecord = user?.id || user?.userId;

    for (const item of parsedItems) {
      const existingBySkuOrName = await this.prisma.product.findFirst({
        where: {
          OR: [{ sku: item.sku }, { name: item.name }],
        },
      });

      if (existingBySkuOrName) {
        const diff = item.stock - existingBySkuOrName.stock;
        const updatedProd = await this.prisma.product.update({
          where: { id: existingBySkuOrName.id },
          data: {
            stock: item.stock,
            unit: item.unit,
            unitCost: item.unitCost > 0 ? item.unitCost : existingBySkuOrName.unitCost,
            totalCost: item.stock * (item.unitCost > 0 ? item.unitCost : existingBySkuOrName.unitCost),
            listPrice: item.listPrice > 0 ? item.listPrice : existingBySkuOrName.listPrice,
            unitPrice: item.unitPrice > 0 ? item.unitPrice : existingBySkuOrName.unitPrice,
            category: item.category,
            subcategory: item.subcategory,
            supplierCode: item.supplierCode || existingBySkuOrName.supplierCode,
            description: item.description || existingBySkuOrName.description,
          },
        });
        updatedCount++;

        if (userIdToRecord && diff !== 0) {
          await this.prisma.movement.create({
            data: {
              productId: updatedProd.id,
              type: diff > 0 ? 'ENTRY' : 'EXIT',
              quantity: Math.abs(diff),
              notes: `Actualización masiva por CSV (${diff > 0 ? '+' : ''}${diff})`,
              userId: userIdToRecord,
            },
          });
        }
      } else {
        const createdProd = await this.prisma.product.create({
          data: item,
        });
        createdCount++;

        if (userIdToRecord && item.stock > 0) {
          await this.prisma.movement.create({
            data: {
              productId: createdProd.id,
              type: 'ENTRY',
              quantity: item.stock,
              notes: `Carga inicial masiva desde CSV`,
              userId: userIdToRecord,
            },
          });
        }
      }
    }

    if (user && parsedItems.length > 0) {
      await this.auditService.createAuditLog({
        productId: 'BULK_IMPORT',
        productSku: 'BULK_CSV',
        productName: `Importación Masiva (${parsedItems.length} items)`,
        action: 'CREATE',
        userId: userIdToRecord || 'SYSTEM',
        userName: user.name || user.email,
        userEmail: user.email,
        userRole: user.role,
        changes: { createdCount, updatedCount, totalItems: parsedItems.length },
      });
    }

    return {
      message: `Importación completada exitosamente. ${createdCount} creados, ${updatedCount} actualizados.`,
      totalParsed: parsedItems.length,
      createdCount,
      updatedCount,
    };
  }
}

