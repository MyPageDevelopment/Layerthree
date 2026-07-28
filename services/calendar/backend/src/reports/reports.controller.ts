import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('projects/:id/export')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
  @ApiOperation({ summary: 'Exportar reporte completo de proyecto en Excel' })
  @ApiResponse({
    status: 200,
    description: 'Archivo Excel generado exitosamente',
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  async exportProjectReport(
    @Param('id') projectId: string,
    @Res() res: Response,
  ): Promise<void> {
    const workbook = await this.reportsService.generateProjectReport(projectId);

    // Configurar headers para descarga
    const filename = `Proyecto_${projectId}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Escribir el archivo Excel en la respuesta
    await workbook.xlsx.write(res);
    res.end();
  }
}
