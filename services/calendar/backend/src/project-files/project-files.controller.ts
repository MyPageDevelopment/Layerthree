import { 
  Controller, 
  Post, 
  Get, 
  Delete,
  Param, 
  UseInterceptors, 
  UploadedFile,
  UploadedFiles,
  Res,
  UseGuards,
  StreamableFile,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ProjectFilesService } from './project-files.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { createReadStream } from 'fs';

@ApiTags('project-files')
@Controller('projects/:projectId/files')
@UseGuards(RolesGuard)
export class ProjectFilesController {
  constructor(private readonly filesService: ProjectFilesService) {}

  @Post(':folder/upload')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Subir archivo a carpeta del proyecto' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Archivo subido exitosamente' })
  async uploadFile(
    @Param('projectId') projectId: string,
    @Param('folder') folder: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    const validFolders = ['Imagenes', 'AS-BUILT', 'Contrato', 'Costos', 'Firmados', 'Anexos', 'Otros'];
    if (!validFolders.includes(folder)) {
      throw new BadRequestException('Carpeta inválida');
    }

    return this.filesService.uploadFile(projectId, folder, file);
  }

  @Get(':folder/list')
  @ApiOperation({ summary: 'Listar archivos de una carpeta' })
  @ApiResponse({ status: 200, description: 'Lista de archivos' })
  async listFiles(
    @Param('projectId') projectId: string,
    @Param('folder') folder: string,
  ) {
    return this.filesService.listFiles(projectId, folder);
  }

  @Get(':folder/download/:filename')
  @ApiOperation({ summary: 'Descargar archivo específico' })
  @ApiResponse({ status: 200, description: 'Archivo descargado' })
  async downloadFile(
    @Param('projectId') projectId: string,
    @Param('folder') folder: string,
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const filePath = await this.filesService.getFilePath(projectId, folder, filename);
    const file = createReadStream(filePath);
    
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    return new StreamableFile(file);
  }

  @Get(':folder/download-zip')
  @ApiOperation({ summary: 'Descargar carpeta completa como ZIP' })
  @ApiResponse({ status: 200, description: 'Carpeta descargada' })
  async downloadFolder(
    @Param('projectId') projectId: string,
    @Param('folder') folder: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const zipPath = await this.filesService.createFolderZip(projectId, folder);
    const file = createReadStream(zipPath);
    
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${folder}.zip"`,
    });

    return new StreamableFile(file);
  }

  @Get('download-all')
  @ApiOperation({ summary: 'Descargar todo el proyecto como ZIP' })
  @ApiResponse({ status: 200, description: 'Proyecto completo descargado' })
  async downloadProject(
    @Param('projectId') projectId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { zipPath, projectName } = await this.filesService.createProjectZip(projectId);
    const file = createReadStream(zipPath);
    
    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${projectName}.zip"`,
    });

    return new StreamableFile(file);
  }

  @Get('planilla-costos')
  @ApiOperation({ summary: 'Descargar planilla de costos' })
  @ApiResponse({ status: 200, description: 'Planilla descargada' })
  async downloadCostTemplate(
    @Res({ passthrough: true }) res: Response,
  ) {
    const filePath = this.filesService.getCostTemplatePath();
    const file = createReadStream(filePath);
    
    res.set({
      'Content-Type': 'application/vnd.ms-excel.sheet.macroEnabled.12',
      'Content-Disposition': 'attachment; filename="PlanillaCostos.xlsm"',
    });

    return new StreamableFile(file);
  }

  @Delete(':folder/:filename')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE')
  @ApiOperation({ summary: 'Eliminar archivo' })
  @ApiResponse({ status: 200, description: 'Archivo eliminado' })
  async deleteFile(
    @Param('projectId') projectId: string,
    @Param('folder') folder: string,
    @Param('filename') filename: string,
  ) {
    return this.filesService.deleteFile(projectId, folder, filename);
  }

  @Get('structure')
  @ApiOperation({ summary: 'Obtener estructura completa de archivos del proyecto' })
  @ApiResponse({ status: 200, description: 'Estructura de archivos' })
  async getProjectStructure(
    @Param('projectId') projectId: string,
  ) {
    return this.filesService.getProjectStructure(projectId);
  }
}
