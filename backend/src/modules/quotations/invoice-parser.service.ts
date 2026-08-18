import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ParsedInvoiceItem {
  rawLineText: string;
  code?: string;
  rawProductName: string;
  quantity: number;
  unitMeasure?: string;
  unitPrice: number;
  totalPrice: number;
  suggestedProductId?: string;
  suggestedProductName?: string;
  suggestedProductSku?: string;
  confidenceScore: number; // 0 to 100
}

export interface ParsedInvoiceResult {
  supplierRut?: string;
  supplierName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  subtotal?: number;
  tax?: number;
  totalAmount?: number;
  items: ParsedInvoiceItem[];
}

@Injectable()
export class InvoiceParserService {
  private logger = new Logger(InvoiceParserService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Extrae campos clave y lista de ítems a partir del texto de una factura (PDF/Imagen/OCR)
   */
  async parseInvoiceContent(rawText: string): Promise<ParsedInvoiceResult> {
    if (!rawText || typeof rawText !== 'string') {
      return { items: [] };
    }

    const cleanText = rawText.replace(/\r\n/g, '\n');
    const lines = cleanText.split('\n').map((l) => l.trim()).filter(Boolean);

    // 1. Extraer RUT Emisor (ej: RUT 79.913.160-9 o R.U.T. : 76.916.076-0)
    let supplierRut: string | undefined;
    const rutMatch = cleanText.match(/R\.?U\.?T\.?\s*:?\s*([\d\.-]+)/i);
    if (rutMatch) {
      supplierRut = rutMatch[1].trim();
    }

    // 2. Extraer Folio / N° Factura (ej: N° 0000834224 o FACTURA ELECTRONICA N° 834224)
    let invoiceNumber: string | undefined;
    const folioMatch = cleanText.match(/(?:FACTURA\s+ELECTR[OÓ]NICA|N[O°º]\s*|FOLIO\s*:?)\s*(\d{4,10})/i);
    if (folioMatch) {
      invoiceNumber = folioMatch[1].trim();
    }

    // 3. Extraer Nombre / Razón Social del Proveedor
    let supplierName: string | undefined;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      if (
        line.toUpperCase().includes('LTDA') ||
        line.toUpperCase().includes('S.A') ||
        line.toUpperCase().includes('SPA') ||
        line.toUpperCase().includes('ESTEC') ||
        line.toUpperCase().includes('SODIMAC') ||
        line.toUpperCase().includes('COMPAÑIA') ||
        line.toUpperCase().includes('COMERCIAL')
      ) {
        supplierName = line.replace(/R\.?U\.?T\.?.*$/i, '').trim();
        break;
      }
    }

    // 4. Extraer Montos Totales
    let totalAmount: number | undefined;
    const totalMatch = cleanText.match(/MONTO\s+TOTAL\s*:?\s*\$?\s*([\d\.\,]+)/i);
    if (totalMatch) {
      totalAmount = this.cleanNumber(totalMatch[1]);
    }

    // 5. Extraer Ítems de la Factura
    const items: ParsedInvoiceItem[] = [];

    // Pattern flexible para facturas chilenas:
    // Cantidad + (Unidad Medida opcional) + Código/Detalle + Precio Unitario + Total
    // Ejemplos:
    // "1 Unid P04357 - TX CAPUCHON GRIS X 50 UNID 2.110 2.110"
    // "20 P20975 - MT TUBO CONDUIT PVC 25MM 3 MTS 4422 FUERTE CEM 920 18.400"
    // "3 unid P07287 - LV CORD CAT 6 UTP 2.1 MTS BLANCO LSZH HIGH FLEX 6H460-07W 10.200 30.600"
    const flexItemRegex = /^(\d+)\s+(?:(Unid|Metr|Cja|Tira|UN|MTS|EA|PZA|KG|LT|unid|mts|tiras|cajas)\s+)?(.+?)\s+([\d\.\,]+)\s+([\d\.\,]+)$/i;

    for (const line of lines) {
      if (
        line.toUpperCase().includes('MONTO TOTAL') ||
        line.toUpperCase().includes('SUBTOTAL') ||
        line.toUpperCase().includes('IVA') ||
        line.toUpperCase().includes('FECHA') ||
        line.toUpperCase().includes('SEÑOR')
      ) {
        continue;
      }

      const match = line.match(flexItemRegex);
      if (match) {
        const qty = parseInt(match[1], 10) || 1;
        const rawUnit = match[2] ? match[2].toUpperCase() : 'UN';
        const rawProductName = match[3].trim();
        const unitPrice = this.cleanNumber(match[4]);
        const totalPrice = this.cleanNumber(match[5]);

        if (qty > 0 && totalPrice > 0 && unitPrice > 0) {
          // Extraer código de producto de la línea si existe (ej: P04357, P20975, P01022)
          const codeMatch = rawProductName.match(/\b(P\d{4,6}|TK\d+|ZL\d+|[A-Z]{1,3}\d{4,6})\b/i);
          const productCode = codeMatch ? codeMatch[1].toUpperCase() : undefined;

          items.push({
            rawLineText: line,
            code: productCode,
            rawProductName,
            quantity: qty,
            unitMeasure: rawUnit === 'METR' ? 'MTS' : rawUnit === 'UNID' ? 'UN' : rawUnit,
            unitPrice,
            totalPrice,
            confidenceScore: 0,
          });
        }
      }
    }

    // 6. Ejecutar Coincidencia Difusa con la Base de Datos de Productos
    const products = await this.prisma.product.findMany({
      where: { isDeleted: false },
      select: { id: true, name: true, sku: true, supplierCode: true, stock: true },
    });

    for (const item of items) {
      this.matchSingleItemWithProducts(item, products);
    }

    return {
      supplierRut,
      supplierName,
      invoiceNumber,
      totalAmount,
      items,
    };
  }

  /**
   * Mapea un ítem extraído contra el catálogo de la base de datos usando Algoritmo de Coincidencia Difusa (Token Set Dice)
   */
  private matchSingleItemWithProducts(
    item: ParsedInvoiceItem,
    products: { id: string; name: string; sku: string; supplierCode?: string | null }[],
  ) {
    let bestMatchProduct: (typeof products)[0] | null = null;
    let maxScore = 0;

    for (const prod of products) {
      // Coincidencia por código extraído (ej: P04357, P20975)
      if (item.code && (prod.sku.toUpperCase() === item.code || (prod.supplierCode && prod.supplierCode.toUpperCase() === item.code))) {
        bestMatchProduct = prod;
        maxScore = 100;
        break;
      }

      // Coincidencia por código de proveedor o SKU dentro del texto
      if (prod.supplierCode && item.rawProductName.toUpperCase().includes(prod.supplierCode.toUpperCase())) {
        bestMatchProduct = prod;
        maxScore = 95;
        break;
      }

      if (item.rawProductName.toUpperCase().includes(prod.sku.toUpperCase())) {
        bestMatchProduct = prod;
        maxScore = 90;
        break;
      }

      const nameScore = this.computeTokenSimilarity(item.rawProductName, prod.name);
      if (nameScore > maxScore) {
        maxScore = nameScore;
        bestMatchProduct = prod;
      }
    }

    if (bestMatchProduct && maxScore >= 25) {
      item.suggestedProductId = bestMatchProduct.id;
      item.suggestedProductName = bestMatchProduct.name;
      item.suggestedProductSku = bestMatchProduct.sku;
      item.confidenceScore = maxScore;
    } else {
      item.confidenceScore = 0;
    }
  }

  /**
   * Calcula el porcentaje de coincidencia difusa entre dos títulos de productos
   */
  private computeTokenSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;

    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\b(unid|metr|tira|cja|p0\d+|p\d+|tk|zl|x)\b/g, '')
        .trim();

    const s1 = normalize(str1);
    const s2 = normalize(str2);

    if (s1 === s2) return 100;

    const t1 = new Set(s1.split(/\s+/).filter((t) => t.length >= 2));
    const t2 = new Set(s2.split(/\s+/).filter((t) => t.length >= 2));

    if (t1.size === 0 || t2.size === 0) return 0;

    let matchCount = 0;
    t1.forEach((token) => {
      if (t2.has(token)) {
        matchCount++;
      } else {
        // Partial token check
        t2.forEach((targetToken) => {
          if (targetToken.includes(token) || token.includes(targetToken)) {
            matchCount += 0.8;
          }
        });
      }
    });

    const dice = (2 * matchCount) / (t1.size + t2.size);
    return Math.min(100, Math.round(dice * 100));
  }

  private cleanNumber(strVal: string): number {
    if (!strVal) return 0;
    const clean = strVal.replace(/\./g, '').replace(',', '.');
    return parseFloat(clean) || 0;
  }
}
