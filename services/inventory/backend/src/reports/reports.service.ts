import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async exportMovementsToCSV(filter?: string, date?: string): Promise<string> {
    const where: any = {};
    
    // Aplicar filtro de fecha
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

    // Cabeceras CSV
    const headers = ['Fecha', 'Tipo', 'Producto', 'SKU', 'Categoría', 'Cantidad', 'ID Proyecto', 'Usuario', 'Notas'];
    
    // Filas de datos
    const rows = movements.map(m => [
      new Date(m.createdAt).toLocaleString('es-CL'),
      m.type === 'ENTRY' ? 'Entrada' : 'Salida',
      m.product.name,
      m.product.sku,
      m.product.category,
      m.quantity,
      m.projectId || '',
      m.user.name,
      (m.notes || '').replace(/"/g, '""'),
    ]);

    // Construir CSV
    return [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');
  }

  async exportInventoryToCSV(): Promise<string> {
    const products = await this.prisma.product.findMany({
      orderBy: { category: 'asc' },
    });

    // Agrupar por categoría
    const headers = ['Categoría', 'Subcategoría', 'SKU', 'Nombre', 'Stock', 'Stock Mínimo', 'Estado', 'Valor Unitario', 'Valor Total'];
    
    const rows = products.map(p => [
      p.category,
      p.subcategory || '',
      p.sku,
      p.name,
      p.stock,
      p.minStock,
      p.stock <= p.minStock ? 'STOCK BAJO' : 'OK',
      p.unitPrice,
      p.stock * p.unitPrice,
    ]);

    // Calcular totales
    const totalValue = products.reduce((sum, p) => sum + (p.stock * p.unitPrice), 0);
    const lowStockCount = products.filter(p => p.stock <= p.minStock).length;

    // Construir CSV con resumen
    return [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';')),
      '',
      `"RESUMEN";;;;;;;;`,
      `"Total Productos";"${products.length}";;;;;;;`,
      `"Productos con Stock Bajo";"${lowStockCount}";;;;;;;`,
      `"Valor Total Inventario";"$${totalValue.toLocaleString()}";;;;;;;`,
    ].join('\n');
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
    const worksheet = workbook.addWorksheet('Inventario', {
      properties: { defaultColWidth: 15 },
    });

    // Configurar columnas con anchos específicos
    worksheet.columns = [
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Nombre', key: 'name', width: 30 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Subcategoría', key: 'subcategory', width: 20 },
      { header: 'Descripción', key: 'description', width: 40 },
      { header: 'Stock Actual', key: 'stock', width: 12 },
      { header: 'Stock Mínimo', key: 'minStock', width: 12 },
      { header: 'Precio Unitario', key: 'unitPrice', width: 15 },
      { header: 'Valor Total', key: 'totalValue', width: 15 },
      { header: 'Estado Stock', key: 'status', width: 15 },
    ];

    // Agregar datos
    products.forEach(product => {
      const totalValue = product.stock * product.unitPrice;
      const status = product.stock <= product.minStock ? 'STOCK BAJO' : 'OK';

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

    // Estilo del encabezado
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Aplicar bordes y formato a todas las celdas con datos
    const totalRows = worksheet.rowCount;
    for (let i = 2; i <= totalRows; i++) {
      const row = worksheet.getRow(i);
      
      // Formato de números
      row.getCell('stock').numFmt = '#,##0';
      row.getCell('minStock').numFmt = '#,##0';
      row.getCell('unitPrice').numFmt = '$#,##0.00';
      row.getCell('totalValue').numFmt = '$#,##0.00';

      // Color de fondo para stock bajo
      if (row.getCell('status').value === 'STOCK BAJO') {
        row.getCell('status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' },
        };
        row.getCell('status').font = { color: { argb: 'FF9C0006' }, bold: true };
      } else {
        row.getCell('status').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC6EFCE' },
        };
        row.getCell('status').font = { color: { argb: 'FF006100' }, bold: true };
      }

      // Bordes para todas las celdas
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        };
      });
    }

    // Crear tabla Excel
    worksheet.addTable({
      name: 'TablaInventario',
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleMedium2',
        showRowStripes: true,
      },
      columns: [
        { name: 'SKU', filterButton: true },
        { name: 'Nombre', filterButton: true },
        { name: 'Categoría', filterButton: true },
        { name: 'Subcategoría', filterButton: true },
        { name: 'Descripción', filterButton: true },
        { name: 'Stock Actual', filterButton: true },
        { name: 'Stock Mínimo', filterButton: true },
        { name: 'Precio Unitario', filterButton: true },
        { name: 'Valor Total', filterButton: true },
        { name: 'Estado Stock', filterButton: true },
      ],
      rows: products.map(p => {
        const totalValue = p.stock * p.unitPrice;
        const status = p.stock <= p.minStock ? 'STOCK BAJO' : 'OK';
        return [
          p.sku,
          p.name,
          p.category || '',
          p.subcategory || '',
          p.description || '',
          p.stock,
          p.minStock,
          p.unitPrice,
          totalValue,
          status,
        ];
      }),
    });

    // Agregar hoja de resumen
    const summarySheet = workbook.addWorksheet('Resumen');
    
    const totalProducts = products.length;
    const lowStockProducts = products.filter(p => p.stock <= p.minStock).length;
    const totalInventoryValue = products.reduce((sum, p) => sum + (p.stock * p.unitPrice), 0);
    const categoriesCount = new Set(products.map(p => p.category)).size;

    summarySheet.columns = [
      { width: 30 },
      { width: 20 },
    ];

    // Título
    summarySheet.mergeCells('A1:B1');
    summarySheet.getCell('A1').value = 'RESUMEN DE INVENTARIO';
    summarySheet.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF4472C4' } };
    summarySheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    // Datos del resumen
    summarySheet.addRow(['']);
    summarySheet.addRow(['Total de Productos:', totalProducts]);
    summarySheet.addRow(['Productos con Stock Bajo:', lowStockProducts]);
    summarySheet.addRow(['Número de Categorías:', categoriesCount]);
    summarySheet.addRow(['Valor Total del Inventario:', totalInventoryValue]);
    summarySheet.addRow(['Fecha de Generación:', new Date()]);

    // Formato del resumen
    for (let i = 3; i <= 7; i++) {
      summarySheet.getRow(i).getCell(1).font = { bold: true };
      summarySheet.getRow(i).getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF2F2F2' },
      };
    }

    summarySheet.getRow(6).getCell(2).numFmt = '$#,##0.00';
    summarySheet.getRow(7).getCell(2).numFmt = 'dd/mm/yyyy hh:mm';

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
