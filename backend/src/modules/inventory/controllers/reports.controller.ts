import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ReportsService } from '../services/reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('movements')
  async exportMovements(
    @Query('filter') filter?: string,
    @Query('date') date?: string,
    @Res() res?: Response,
  ) {
    const excelBuffer = await this.reportsService.exportMovementsToExcel(filter, date);
    const filename = `movimientos_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(excelBuffer);
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
