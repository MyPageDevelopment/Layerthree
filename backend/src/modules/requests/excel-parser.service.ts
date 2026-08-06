import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

export interface ParsedRequestItem {
  productId?: string | null;
  sku?: string | null;
  productName: string;
  requestedQuantity: number;
  unitMeasure?: string;
  inStockQuantity?: number;
  isMatched?: boolean;
}

@Injectable()
export class ExcelParserService {
  private logger = new Logger(ExcelParserService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Procesa inteligentemente un archivo Excel (.xlsx, .xlsm, .xls) o CSV y extrae los materiales solicitados.
   */
  async parseExcelBuffer(
    buffer: Buffer,
    fileName: string,
  ): Promise<{ items: ParsedRequestItem[]; totalParsed: number; matchedCount: number }> {
    const isCsv = fileName.toLowerCase().endsWith('.csv');
    let rowsData: string[][] = [];

    if (isCsv) {
      rowsData = this.parseCsvContent(buffer.toString('utf-8'));
      if (rowsData.length === 0) {
        // Fallback for latin1 encoding
        rowsData = this.parseCsvContent(buffer.toString('latin1'));
      }
    } else {
      rowsData = await this.parseExcelWorkbook(buffer);
    }

    if (rowsData.length === 0) {
      return { items: [], totalParsed: 0, matchedCount: 0 };
    }

    // 1. Fetch current inventory products to perform intelligent matching
    const dbProducts = await this.prisma.product.findMany({
      where: { isDeleted: false },
    });

    const skuMap = new Map<string, any>();
    const nameMap = new Map<string, any>();
    const normalizedNameMap = new Map<string, any>();

    const normalizeStr = (str: string): string => {
      return (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
    };

    for (const p of dbProducts) {
      if (p.sku) skuMap.set(p.sku.toUpperCase().trim(), p);
      if (p.name) {
        nameMap.set(p.name.toUpperCase().trim(), p);
        normalizedNameMap.set(normalizeStr(p.name), p);
      }
    }

    // 2. Identify header row index if present
    let nameColIdx = -1;
    let qtyColIdx = -1;
    let skuColIdx = -1;
    let unitColIdx = -1;
    let headerRowIdx = -1;

    const nameKeywords = ['PRODUCTO', 'NOMBRE', 'DESCRIPCION', 'MATERIAL', 'ITEM', 'DETALLE', 'EQUIPO', 'CABLE'];
    const qtyKeywords = ['CANTIDAD', 'CANT', 'QTY', 'CANT.', 'REQUERIDO', 'SOLICITADO', 'UNIDADES'];
    const skuKeywords = ['SKU', 'CODIGO', 'COD', 'CODIGO PROVEEDOR', 'COD.', 'PARTE', 'PART_NUMBER'];
    const unitKeywords = ['UNIDAD', 'MEDIDA', 'U.M.', 'UM', 'TIPO'];

    for (let r = 0; r < Math.min(15, rowsData.length); r++) {
      const row = rowsData[r];
      for (let c = 0; c < row.length; c++) {
        const cellUpper = (row[c] || '').toUpperCase().trim();
        if (nameKeywords.some((k) => cellUpper.includes(k)) && nameColIdx === -1) {
          nameColIdx = c;
        }
        if (qtyKeywords.some((k) => cellUpper.includes(k)) && qtyColIdx === -1) {
          qtyColIdx = c;
        }
        if (skuKeywords.some((k) => cellUpper.includes(k)) && skuColIdx === -1) {
          skuColIdx = c;
        }
        if (unitKeywords.some((k) => cellUpper.includes(k)) && unitColIdx === -1) {
          unitColIdx = c;
        }
      }

      if (nameColIdx !== -1 && (qtyColIdx !== -1 || r > 3)) {
        headerRowIdx = r;
        break;
      }
    }

    const extractedItems: ParsedRequestItem[] = [];
    let matchedCount = 0;

    // Helper to parse numeric values from formatted currency/string (e.g., "$28,394" -> 28394 or "10" -> 10)
    const parseQtyNumber = (valStr: string): number => {
      if (!valStr) return 0;
      const clean = valStr.replace(/\$/g, '').replace(/\s+/g, '').replace(/,/g, '');
      const num = parseFloat(clean);
      return !isNaN(num) && num > 0 ? num : 0;
    };

    // 3. Process data rows
    const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 0;

    for (let r = startRow; r < rowsData.length; r++) {
      const row = rowsData[r];
      if (!row || row.length === 0) continue;

      let rawName = '';
      let rawSku = '';
      let rawUnit = '';
      let rawQty = 0;

      if (headerRowIdx !== -1 && nameColIdx !== -1) {
        rawName = row[nameColIdx] || '';
        rawSku = skuColIdx !== -1 ? row[skuColIdx] || '' : '';
        rawUnit = unitColIdx !== -1 ? row[unitColIdx] || '' : '';

        if (qtyColIdx !== -1) {
          rawQty = parseQtyNumber(row[qtyColIdx] || '0');
        } else {
          // Scan row for any positive number if qty column wasn't explicitly marked
          for (let c = 0; c < row.length; c++) {
            if (c !== nameColIdx && c !== skuColIdx) {
              const q = parseQtyNumber(row[c]);
              if (q > 0) {
                rawQty = q;
                break;
              }
            }
          }
        }
      } else {
        // Fallback for plantillas without standard header (e.g. NuevaPlanilla2.csv structure)
        // Find text column for product name and SKU
        for (let c = 0; c < row.length; c++) {
          const val = (row[c] || '').trim();
          if (val.length >= 2 && !val.startsWith('$') && isNaN(Number(val))) {
            const valUpper = val.toUpperCase();
            if (!nameKeywords.some((k) => valUpper.includes(k))) {
              if (!rawName && val.length >= 3) {
                rawName = val;
              } else if (!rawSku && val.length <= 15 && !val.includes(' ') && !['UN', 'TIRA', 'MTS', 'ROLLO', 'CAJA', 'KG'].includes(valUpper)) {
                rawSku = val;
              }
            }
          }
        }

        // Find unit & quantity in row
        for (let c = 0; c < row.length; c++) {
          const val = (row[c] || '').trim();
          const upper = val.toUpperCase();
          if (['UN', 'TIRA', 'MTS', 'ROLLO', 'CAJA', 'KG', 'M', 'METROS'].includes(upper)) {
            rawUnit = upper;
          }
          const num = parseQtyNumber(val);
          if (num > 0) {
            rawQty = num;
          }
        }
      }

      rawName = rawName.trim();
      if (!rawName || rawName.length < 2) continue;
      if (rawQty <= 0) continue; // Only include requested items with positive quantities

      // Match item against database inventory
      let matchedProduct = skuMap.get(rawSku.toUpperCase());
      if (!matchedProduct) {
        matchedProduct = nameMap.get(rawName.toUpperCase());
      }
      if (!matchedProduct) {
        matchedProduct = normalizedNameMap.get(normalizeStr(rawName));
      }

      // Check fuzzy substring match if no exact match found
      if (!matchedProduct && rawName.length > 5) {
        const normTarget = normalizeStr(rawName);
        for (const [normKey, prod] of normalizedNameMap.entries()) {
          if (normTarget.includes(normKey) || normKey.includes(normTarget)) {
            matchedProduct = prod;
            break;
          }
        }
      }

      const isUtp = rawName.toUpperCase().includes('UTP') || (matchedProduct?.name || '').toUpperCase().includes('UTP');
      const finalUnit = isUtp ? 'MTS' : (rawUnit.toUpperCase() || matchedProduct?.unit || 'UN');

      if (matchedProduct) {
        matchedCount++;
        extractedItems.push({
          productId: matchedProduct.id,
          sku: matchedProduct.sku,
          productName: matchedProduct.name,
          requestedQuantity: Math.round(rawQty),
          unitMeasure: finalUnit,
          inStockQuantity: matchedProduct.stock,
          isMatched: true,
        });
      } else {
        // Record non-matched custom product so it is NEVER lost or ignored
        extractedItems.push({
          productId: null,
          sku: rawSku || 'N/A',
          productName: rawName,
          requestedQuantity: Math.round(rawQty),
          unitMeasure: finalUnit,
          inStockQuantity: 0,
          isMatched: false,
        });
      }
    }

    this.logger.log(`📊 Planilla procesada (${fileName}): ${extractedItems.length} ítems extraídos (${matchedCount} coinciden con el inventario)`);

    return {
      items: extractedItems,
      totalParsed: extractedItems.length,
      matchedCount,
    };
  }

  private parseCsvContent(csvText: string): string[][] {
    const lines = (csvText || '').split(/\r?\n/);
    const result: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols: string[] = [];
      let current = '';
      let inQuotes = false;
      const delimiter = line.includes(';') && !line.includes(',') ? ';' : ',';

      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          cols.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cols.push(current.trim());
      result.push(cols);
    }
    return result;
  }

  private async parseExcelWorkbook(buffer: Buffer): Promise<string[][]> {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);

      const rows: string[][] = [];
      const worksheet = workbook.worksheets[0];
      if (!worksheet) return [];

      worksheet.eachRow({ includeEmpty: false }, (row) => {
        const rowValues: string[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          let val = '';
          if (cell.value !== null && cell.value !== undefined) {
            if (typeof cell.value === 'object') {
              val = (cell.value as any).result !== undefined ? String((cell.value as any).result) : String((cell.value as any).text || '');
            } else {
              val = String(cell.value);
            }
          }
          rowValues.push(val);
        });
        if (rowValues.some((v) => v.trim().length > 0)) {
          rows.push(rowValues);
        }
      });

      return rows;
    } catch (err) {
      this.logger.error('Error al analizar workbook de Excel:', err);
      return [];
    }
  }
}
