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

    // Pattern típico chileno: Cantidad + Unidad + Detalle + Precio Unitario + Total
    // Ejemplo: "2 Unid P01022 - TX MODULO RJ45 CAT 6 BLANCO 1.930 3.860"
    // Ejemplo: "50 Unid P05565 - TK EMT ABRAZADERA 20MM TIPO CADDY 172 8.600"
    const itemRegex = /^(\d+)\s+(Unid|Metr|Cja|Tira|UN|MTS|EA|PZA|KG|LT)\s+(.+?)\s+([\d\.\,]+)\s+([\d\.\,]+)$/i;
    const fallbackRegex = /^(\d+)\s+(.+?)\s+([\d\.\,]+)\s+([\d\.\,]+)$/i;

    for (const line of lines) {
      const match = line.match(itemRegex);
      if (match) {
        const qty = parseInt(match[1], 10) || 1;
        const unitMeasure = match[2].toUpperCase();
        const rawProductName = match[3].trim();
        const unitPrice = this.cleanNumber(match[4]);
        const totalPrice = this.cleanNumber(match[5]);

        items.push({
          rawLineText: line,
          rawProductName,
          quantity: qty,
          unitMeasure: unitMeasure === 'METR' ? 'MTS' : unitMeasure === 'UNID' ? 'UN' : unitMeasure,
          unitPrice,
          totalPrice,
          confidenceScore: 0,
        });
        continue;
      }

      const fbMatch = line.match(fallbackRegex);
      if (fbMatch && !line.toUpperCase().includes('TOTAL') && !line.toUpperCase().includes('FECHA')) {
        const qty = parseInt(fbMatch[1], 10) || 1;
        const rawProductName = fbMatch[2].trim();
        const unitPrice = this.cleanNumber(fbMatch[3]);
        const totalPrice = this.cleanNumber(fbMatch[4]);

        if (qty > 0 && totalPrice >= unitPrice && unitPrice > 0) {
          items.push({
            rawLineText: line,
            rawProductName,
            quantity: qty,
            unitMeasure: 'UN',
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
      // Coincidencia exacta por código de proveedor o SKU
      if (prod.supplierCode && item.rawProductName.toUpperCase().includes(prod.supplierCode.toUpperCase())) {
        bestMatchProduct = prod;
        maxScore = 100;
        break;
      }

      if (item.rawProductName.toUpperCase().includes(prod.sku.toUpperCase())) {
        bestMatchProduct = prod;
        maxScore = 95;
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
