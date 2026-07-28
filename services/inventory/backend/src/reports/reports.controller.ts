import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModulesGuard } from '../auth/guards/modules.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, ModulesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('movements')
  async exportMovements(
    @Query('filter') filter?: string,
    @Query('date') date?: string,
    @Res() res?: Response,
  ) {
    const csv = await this.reportsService.exportMovementsToCSV(filter, date);
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=movimientos.csv');
    res.send('\uFEFF' + csv); // BOM para Excel
  }

  @Get('inventory')
  async exportInventory(@Res() res: Response) {
    const excelBuffer = await this.reportsService.exportInventoryToExcel();
    
    const filename = `inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(excelBuffer);
  }
}
