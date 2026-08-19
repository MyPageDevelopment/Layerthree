import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProductAuditService } from './product-audit.service';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

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

    const unit = createProductDto.unit
      ? createProductDto.unit.toUpperCase().trim()
      : ((createProductDto.name && createProductDto.name.toUpperCase().includes('UTP')) ||
         (createProductDto.sku && createProductDto.sku.toUpperCase().includes('UTP')))
      ? 'MTS'
      : 'UN';
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

    const newUnit = updateProductDto.unit
      ? updateProductDto.unit.toUpperCase().trim()
      : product.unit ||
        (((updateProductDto.name || product.name).toUpperCase().includes('UTP') ||
          (updateProductDto.sku || product.sku).toUpperCase().includes('UTP'))
          ? 'MTS'
          : 'UN');

    const newStock = updateProductDto.stock !== undefined ? updateProductDto.stock : product.stock;
    const newUnitCost = updateProductDto.unitCost !== undefined
      ? updateProductDto.unitCost
      : (updateProductDto.unitPrice !== undefined ? updateProductDto.unitPrice : product.unitCost);
    const newUnitPrice = updateProductDto.unitPrice !== undefined
      ? updateProductDto.unitPrice
      : (updateProductDto.unitCost !== undefined ? updateProductDto.unitCost : product.unitPrice);
    const newTotalCost = newStock * newUnitCost;

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
      WHERE isDeleted = false AND stock < minStock
      ORDER BY (minStock - stock) DESC, name ASC
    `;
  }

  async getNextSku(categoryStr?: string, subcategoryStr?: string): Promise<{ nextSku: string }> {
    const cat = (categoryStr || 'RED').toUpperCase().trim();
    const subcat = (subcategoryStr || '').toUpperCase().trim();

    let prefix = 'LT-RED-';

    if (cat.includes('FIBRA') || cat.includes('OPTICA') || cat.includes('F.O')) {
      prefix = 'LT-F.O-';
    } else if (cat.includes('ELECTRI')) {
      prefix = 'LT-ELE-';
    } else if (cat.includes('INSUMO') || cat.includes('FERRETERIA') || cat.includes('FIJACION') || cat.includes('CONSUMIBLES')) {
      prefix = 'LT-FER-';
    } else if (cat.includes('HERRAMIENTA') || cat.includes('EQUIPO') || cat.includes('EPP')) {
      if (subcat.includes('RACK') || subcat.includes('GABINETE')) {
        prefix = 'LT-RAC-';
      } else {
        prefix = 'LT-HER-';
      }
    } else if (cat.includes('CANALIZA') || cat.includes('EMT') || cat.includes('PVC') || cat.includes('BPC') || cat.includes('BANDEJA')) {
      if (subcat.includes('BANDEJA') || subcat.includes('BPC') || subcat.includes('ESCALERILLA')) {
        prefix = 'LT-BPC-';
      } else if (subcat.includes('PVC')) {
        prefix = 'LT-PVC-';
      } else if (subcat.includes('CANALETA') || subcat.includes('DLP') || subcat.includes('ZOLODA')) {
        prefix = 'LT-DLP-';
      } else if (subcat.includes('POSTE') || subcat.includes('INFRAESTRUCTURA')) {
        prefix = 'LT-POS-';
      } else {
        prefix = 'LT-EMT-';
      }
    } else if (cat.includes('RED')) {
      prefix = 'LT-RED-';
    }

    const products = await this.prisma.product.findMany({
      where: {
        sku: {
          startsWith: prefix,
        },
      },
      select: { sku: true },
    });

    let maxNum = 0;
    for (const p of products) {
      const numPart = p.sku.replace(prefix, '');
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }

    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    return { nextSku: `${prefix}${nextNum}` };
  }

  private fixEncodingString(str: string): string {
    if (!str) return '';

    // Check if string contains Macintosh char codes (e.g. 0x97 for ó, 0x87 for á, 0x92 for í, 0x96 for ñ)
    let hasMacChar = false;
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      bytes.push(code);
      if (code === 0x97 || code === 0x87 || code === 0x92 || code === 0x96 || code === 0x8e || code === 0x9c) {
        hasMacChar = true;
      }
    }

    if (hasMacChar) {
      try {
        const uint8 = new Uint8Array(bytes);
        return new TextDecoder('macintosh').decode(uint8);
      } catch (e) {}
    }

    return str;
  }

  async importCsvData(csvText: string, user?: any) {
    if (!csvText || typeof csvText !== 'string' || !csvText.trim()) {
      return {
        message: 'El archivo CSV está vacío o no contiene datos válidos.',
        totalParsed: 0,
        createdCount: 0,
        updatedCount: 0,
        failedCount: 0,
      };
    }

    // Full multi-line CSV Tokenizer: handles quoted fields with newlines without breaking quote state
    const parseCsvText = (text: string): string[][] => {
      let delimiter = ',';
      const firstLineEnd = text.indexOf('\n');
      const sample = firstLineEnd !== -1 ? text.substring(0, firstLineEnd) : text;
      const semiCount = (sample.match(/;/g) || []).length;
      const commaCount = (sample.match(/,/g) || []).length;
      const tabCount = (sample.match(/\t/g) || []).length;

      if (semiCount > commaCount && semiCount > tabCount) {
        delimiter = ';';
      } else if (tabCount > commaCount && tabCount > semiCount) {
        delimiter = '\t';
      }

      const records: string[][] = [];
      let currentRecord: string[] = [];
      let currentField = '';
      let inQuotes = false;

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentField += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          currentRecord.push(currentField.trim());
          currentField = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') i++;
          currentRecord.push(currentField.trim());
          if (currentRecord.some((f) => f.length > 0)) {
            records.push(currentRecord);
          }
          currentRecord = [];
          currentField = '';
        } else {
          currentField += char;
        }
      }

      if (currentField || currentRecord.length > 0) {
        currentRecord.push(currentField.trim());
        if (currentRecord.some((f) => f.length > 0)) {
          records.push(currentRecord);
        }
      }

      return records;
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

    const records = parseCsvText(csvText);
    const parsedItems: any[] = [];
    let currentCategory: any = 'INSUMOS';
    let currentSubcategory: string | null = null;
    const knownHeaderTexts = ['PRODUCTOS', 'CANTIDAD', 'TIPO', 'PROVEEDOR', 'CLIENTE', 'PLANILLA', 'MAY-25'];

    for (let i = 0; i < records.length; i++) {
      const cols = records[i];
      if (!cols || cols.length === 0) continue;

      // Skip header rows
      if (
        (cols[0] && cols[0].toLowerCase().includes('sku')) ||
        (cols[1] && cols[1].toLowerCase().includes('nombre'))
      ) {
        continue;
      }

      let rawSku = this.fixEncodingString((cols[0] || '').trim());
      let rawName = this.fixEncodingString((cols[1] || '').trim());

      // If both SKU and Name are empty (e.g. blank lines in CSV), skip
      if (!rawSku && !rawName) continue;

      const rawCategoryStr = this.fixEncodingString(cols[2] || '');
      const rawSubcat = this.fixEncodingString(cols[3] || '').substring(0, 100);
      const rawQty = parseFloat(cols[4]) || 0;
      const rawUnitType = this.fixEncodingString(cols[5] || '').toUpperCase().trim().substring(0, 20);
      const rawUnitCost = parseFloat(cols[6]) || 0;
      const rawListPrice = parseFloat(cols[8]) || 0;
      const rawSupplierCode = cols[10] ? this.fixEncodingString(cols[10].trim()).substring(0, 100) : null;
      const obs = this.fixEncodingString(cols[11] || '');

      // Check if it's structured format (with SKU or Name)
      if (cols.length >= 2 && (rawSku || rawName)) {
        if (!rawSku && rawName) {
          const slug = rawName.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').substring(0, 35);
          rawSku = `SKU-${slug}-${i}`;
        }

        rawSku = rawSku.substring(0, 100);
        rawName = rawName.substring(0, 255);

        const mappedCat = mapCategory(rawCategoryStr);
        const stock = Math.max(0, Math.round(rawQty));
        
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

      const legacyName = cols[2] ? this.fixEncodingString(cols[2].trim()).substring(0, 255) : '';
      if (!legacyName || legacyName.length < 2) continue;

      const upperName = legacyName.toUpperCase();
      if (knownHeaderTexts.some((h) => upperName.includes(h))) continue;

      const subDetail = cols[3] ? this.fixEncodingString(cols[3].trim()) : '';
      const unitType = cols[4] ? this.fixEncodingString(cols[4]).toUpperCase().trim().substring(0, 20) : '';

      let totalStock = 0;
      for (let c = 5; c < cols.length; c++) {
        const val = parseFloat(cols[c]);
        if (!isNaN(val) && val > 0) {
          totalStock += Math.round(val);
        }
      }

      const slug = (legacyName + ' ' + subDetail)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 35);
      const sku = `SKU-${slug}-${i}`.substring(0, 100);

      const fullName = (subDetail ? `${legacyName} (${subDetail})` : legacyName).substring(0, 255);
      const description = unitType ? `Tipo: ${unitType}` : undefined;
      const isUtp = fullName.toUpperCase().includes('UTP') || sku.toUpperCase().includes('UTP');
      const unit = isUtp ? 'MTS' : (unitType || 'UN');

      parsedItems.push({
        sku,
        name: fullName,
        description,
        category: currentCategory,
        subcategory: currentSubcategory ? currentSubcategory.substring(0, 100) : null,
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
    let failedCount = 0;
    const itemErrors: string[] = [];
    const userIdToRecord = user?.id || user?.userId;

    for (let idx = 0; idx < parsedItems.length; idx++) {
      const item = parsedItems[idx];
      try {
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
      } catch (err: any) {
        failedCount++;
        const errorMsg = `Fila ${idx + 1} (${item.sku || item.name}): ${err.message || 'Error al guardar'}`;
        this.logger.error(`Error importando item CSV: ${errorMsg}`, err.stack);
        if (itemErrors.length < 10) {
          itemErrors.push(errorMsg);
        }
      }
    }

    if (user && (createdCount > 0 || updatedCount > 0)) {
      await this.auditService.createAuditLog({
        productId: 'BULK_IMPORT',
        productSku: 'BULK_CSV',
        productName: `Importación Masiva (${parsedItems.length} items procesados)`,
        action: 'CREATE',
        userId: userIdToRecord || 'SYSTEM',
        userName: user.name || user.email,
        userEmail: user.email,
        userRole: user.role,
        changes: { createdCount, updatedCount, failedCount, totalItems: parsedItems.length },
      });
    }

    const message = failedCount > 0
      ? `Importación realizada con advertencias. ${createdCount} creados, ${updatedCount} actualizados, ${failedCount} con error.`
      : `Importación completada exitosamente. ${createdCount} creados, ${updatedCount} actualizados.`;

    return {
      message,
      totalParsed: parsedItems.length,
      createdCount,
      updatedCount,
      failedCount,
      errors: itemErrors.length > 0 ? itemErrors : undefined,
    };
  }
}

