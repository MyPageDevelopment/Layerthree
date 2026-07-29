import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async exportMovementsToExcel(filter?: string, date?: string): Promise<Buffer> {
    const where: any = {};
    
    if (filter && date) {
      const selectedDate = new Date(date);
      
      switch (filter) {
        case 'day':
          const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
          const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));
          where.createdAt = { gte: startOfDay, lte: endOfDay };
          break;
        case 'month':
          const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
          const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
          where.createdAt = { gte: startOfMonth, lte: endOfMonth };
          break;
        case 'year':
          const startOfYear = new Date(selectedDate.getFullYear(), 0, 1);
          const endOfYear = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999);
          where.createdAt = { gte: startOfYear, lte: endOfYear };
          break;
      }
    }

    const movements = await this.prisma.movement.findMany({
      where,
      include: {
        product: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Movimientos de Stock', {
      properties: { defaultColWidth: 16 },
    });

    worksheet.columns = [
      { header: 'Fecha y Hora', key: 'createdAt', width: 22 },
      { header: 'Tipo Movimiento', key: 'type', width: 16 },
      { header: 'Producto', key: 'productName', width: 32 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Categoría', key: 'category', width: 18 },
      { header: 'Cantidad', key: 'quantity', width: 12 },
      { header: 'ID Proyecto', key: 'projectId', width: 16 },
      { header: 'Usuario Registro', key: 'user', width: 25 },
      { header: 'Notas / Observaciones', key: 'notes', width: 45 },
    ];

    movements.forEach(m => {
      worksheet.addRow({
        createdAt: new Date(m.createdAt).toLocaleString('es-CL'),
        type: m.type === 'ENTRY' ? 'ENTRADA' : 'SALIDA',
        productName: m.product.name,
        sku: m.product.sku,
        category: m.product.category,
        quantity: m.quantity,
        projectId: m.projectId || '-',
        user: m.user ? `${m.user.name || ''} (${m.user.email})` : m.userId,
        notes: m.notes || '',
      });
    });

    // Style Headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }, // Dark Slate Blue
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    // Format Data Rows
    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const typeCell = row.getCell('type');

      if (typeCell.value === 'ENTRADA') {
        typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Light Green
        typeCell.font = { color: { argb: 'FF065F46' }, bold: true };
      } else {
        typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Light Red
        typeCell.font = { color: { argb: 'FF991B1B' }, bold: true };
      }

      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async exportInventoryToExcel(): Promise<Buffer> {
    const products = await this.prisma.product.findMany({
      orderBy: [
        { category: 'asc' },
        { subcategory: 'asc' },
        { name: 'asc' },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Inventario Bodega', {
      properties: { defaultColWidth: 16 },
    });

    worksheet.columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Nombre del Producto', key: 'name', width: 35 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Subcategoría', key: 'subcategory', width: 20 },
      { header: 'Descripción', key: 'description', width: 40 },
      { header: 'Stock Actual', key: 'stock', width: 14 },
      { header: 'Stock Mínimo', key: 'minStock', width: 14 },
      { header: 'Precio Unitario', key: 'unitPrice', width: 18 },
      { header: 'Valor Total Stock', key: 'totalValue', width: 20 },
      { header: 'Estado Alerta', key: 'status', width: 16 },
    ];

    products.forEach(product => {
      const totalValue = product.stock * product.unitPrice;
      const status = product.stock <= product.minStock ? 'STOCK BAJO' : 'ÓPTIMO';

      worksheet.addRow({
        sku: product.sku,
        name: product.name,
        category: product.category || '',
        subcategory: product.subcategory || '',
        description: product.description || '',
        stock: product.stock,
        minStock: product.minStock,
        unitPrice: product.unitPrice,
        totalValue: totalValue,
        status: status,
      });
    });

    // Style Headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    const totalRows = worksheet.rowCount;
    for (let i = 2; i <= totalRows; i++) {
      const row = worksheet.getRow(i);
      
      row.getCell('stock').numFmt = '#,##0';
      row.getCell('minStock').numFmt = '#,##0';
      row.getCell('unitPrice').numFmt = '$#,##0';
      row.getCell('totalValue').numFmt = '$#,##0';

      const statusCell = row.getCell('status');
      if (statusCell.value === 'STOCK BAJO') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        statusCell.font = { color: { argb: 'FF991B1B' }, bold: true };
      } else {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
        statusCell.font = { color: { argb: 'FF065F46' }, bold: true };
      }

      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
    }

    const summarySheet = workbook.addWorksheet('Resumen Ejecutivo');
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.stock <= p.minStock).length;
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.stock * p.unitPrice), 0);

    summarySheet.columns = [{ width: 32 }, { width: 25 }];

    summarySheet.mergeCells('A1:B1');
    summarySheet.getCell('A1').value = 'RESUMEN EJECUTIVO DE INVENTARIO';
    summarySheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FF1E293B' } };
    summarySheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    summarySheet.addRow(['']);
    summarySheet.addRow(['Total de Productos Registrados:', totalProducts]);
    summarySheet.addRow(['Productos con Alerta de Stock Bajo:', lowStockProducts]);
    summarySheet.addRow(['Valorización Total del Inventario:', totalInventoryValue]);
    summarySheet.addRow(['Fecha de Reporte:', new Date().toLocaleString('es-CL')]);

    for (let i = 3; i <= 6; i++) {
      summarySheet.getRow(i).getCell(1).font = { bold: true };
      summarySheet.getRow(i).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    }

    summarySheet.getRow(5).getCell(2).numFmt = '$#,##0';

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
