import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateProjectReport(projectId: string): Promise<ExcelJS.Workbook> {
    // Obtener información completa del proyecto
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: true,
        manager: true,
        tasks: {
          include: {
            assignments: {
              include: {
                user: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        milestones: {
          orderBy: { dueDate: 'asc' },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Proyecto con ID ${projectId} no encontrado`);
    }

    // Crear libro de Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Layerthree';
    workbook.created = new Date();

    // ===== HOJA 1: INFORMACIÓN DEL PROYECTO =====
    const projectSheet = workbook.addWorksheet('Información del Proyecto');

    // Configurar ancho de columnas
    projectSheet.columns = [
      { width: 25 },
      { width: 50 },
    ];

    // Título
    projectSheet.mergeCells('A1:B1');
    const titleCell = projectSheet.getCell('A1');
    titleCell.value = `REPORTE DE PROYECTO: ${project.name}`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    projectSheet.getRow(1).height = 30;

    // Información del proyecto
    let row = 3;
    const addInfoRow = (label: string, value: any) => {
      const labelCell = projectSheet.getCell(`A${row}`);
      const valueCell = projectSheet.getCell(`B${row}`);
      
      labelCell.value = label;
      labelCell.font = { bold: true };
      labelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' },
      };
      
      valueCell.value = value || 'N/A';
      row++;
    };

    addInfoRow('Código', project.code);
    addInfoRow('Nombre', project.name);
    addInfoRow('Estado', project.status);
    addInfoRow('Prioridad', project.priority);
    addInfoRow('Responsable', project.owner?.name || 'N/A');
    addInfoRow('Gerente', project.manager?.name || 'N/A');
    addInfoRow('Cliente', project.clientName || 'N/A');
    addInfoRow('Ubicación', project.location || 'N/A');
    addInfoRow('Fecha Inicio', project.startDate ? project.startDate.toLocaleDateString() : 'N/A');
    addInfoRow('Fecha Fin', project.endDate ? project.endDate.toLocaleDateString() : 'N/A');
    addInfoRow('Presupuesto', project.budget ? `$${project.budget.toLocaleString()}` : 'N/A');
    addInfoRow('Horas Estimadas', project.estimatedHours || 'N/A');
    addInfoRow('Horas Reales', project.actualHours || 0);
    addInfoRow('Descripción', project.description || 'N/A');

    // ===== HOJA 2: TAREAS =====
    const tasksSheet = workbook.addWorksheet('Tareas');

    // Encabezados
    tasksSheet.columns = [
      { header: 'Código', key: 'code', width: 15 },
      { header: 'Título', key: 'title', width: 30 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Prioridad', key: 'priority', width: 12 },
      { header: 'Fecha Inicio', key: 'startDate', width: 15 },
      { header: 'Fecha Fin', key: 'endDate', width: 15 },
      { header: 'Fecha Límite', key: 'dueDate', width: 15 },
      { header: 'Horas Estimadas', key: 'estimatedHours', width: 15 },
      { header: 'Horas Reales', key: 'actualHours', width: 15 },
      { header: 'Progreso %', key: 'progress', width: 12 },
      { header: 'Participantes', key: 'participants', width: 40 },
    ];

    // Estilo de encabezados
    const headerRow = tasksSheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' },
    };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.height = 25;

    // Datos de tareas
    project.tasks.forEach((task) => {
      const participants = task.assignments
        .map((a) => `${a.user.name} (${a.role})`)
        .join(', ');

      tasksSheet.addRow({
        code: task.code,
        title: task.title,
        status: task.status,
        priority: task.priority,
        startDate: task.startDate ? task.startDate.toLocaleDateString() : '',
        endDate: task.endDate ? task.endDate.toLocaleDateString() : '',
        dueDate: task.dueDate ? task.dueDate.toLocaleDateString() : '',
        estimatedHours: task.estimatedHours || 0,
        actualHours: task.actualHours || 0,
        progress: task.progress,
        participants: participants || 'Sin asignar',
      });
    });

    // Aplicar bordes a todas las celdas con datos
    tasksSheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // ===== HOJA 3: HITOS =====
    if (project.milestones.length > 0) {
      const milestonesSheet = workbook.addWorksheet('Hitos');

      milestonesSheet.columns = [
        { header: 'Nombre', key: 'name', width: 30 },
        { header: 'Descripción', key: 'description', width: 50 },
        { header: 'Fecha Límite', key: 'dueDate', width: 15 },
        { header: 'Fecha Completado', key: 'completedAt', width: 15 },
      ];

      // Estilo de encabezados
      const milestoneHeaderRow = milestonesSheet.getRow(1);
      milestoneHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      milestoneHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF8B5CF6' },
      };
      milestoneHeaderRow.alignment = { horizontal: 'center', vertical: 'middle' };
      milestoneHeaderRow.height = 25;

      project.milestones.forEach((milestone) => {
        milestonesSheet.addRow({
          name: milestone.name,
          description: milestone.description || '',
          dueDate: milestone.dueDate.toLocaleDateString(),
          completedAt: milestone.completedAt ? milestone.completedAt.toLocaleDateString() : 'Pendiente',
        });
      });

      // Bordes
      milestonesSheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
      });
    }

    // ===== HOJA 4: RESUMEN ESTADÍSTICO =====
    const statsSheet = workbook.addWorksheet('Resumen Estadístico');

    statsSheet.columns = [
      { width: 30 },
      { width: 20 },
    ];

    // Título
    statsSheet.mergeCells('A1:B1');
    const statsTitleCell = statsSheet.getCell('A1');
    statsTitleCell.value = 'RESUMEN ESTADÍSTICO';
    statsTitleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    statsTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEF4444' },
    };
    statsTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    statsSheet.getRow(1).height = 25;

    // Estadísticas
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === 'COMPLETED').length;
    const inProgressTasks = project.tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const pendingTasks = project.tasks.filter((t) => t.status === 'PENDING').length;
    const blockedTasks = project.tasks.filter((t) => t.status === 'BLOCKED').length;

    let statsRow = 3;
    const addStatRow = (label: string, value: any) => {
      const labelCell = statsSheet.getCell(`A${statsRow}`);
      const valueCell = statsSheet.getCell(`B${statsRow}`);
      
      labelCell.value = label;
      labelCell.font = { bold: true };
      valueCell.value = value;
      valueCell.alignment = { horizontal: 'right' };
      statsRow++;
    };

    addStatRow('Total de Tareas', totalTasks);
    addStatRow('Tareas Completadas', completedTasks);
    addStatRow('Tareas en Progreso', inProgressTasks);
    addStatRow('Tareas Pendientes', pendingTasks);
    addStatRow('Tareas Bloqueadas', blockedTasks);
    statsRow++;
    addStatRow('% Completado', totalTasks > 0 ? `${((completedTasks / totalTasks) * 100).toFixed(1)}%` : '0%');

    return workbook;
  }
}
