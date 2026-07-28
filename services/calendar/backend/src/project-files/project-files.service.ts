import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { join } from 'path';
import { promises as fs } from 'fs';
import * as archiver from 'archiver';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';

@Injectable()
export class ProjectFilesService {
  private readonly uploadsPath = process.env.UPLOADS_PATH || './uploads/projects';
  private readonly templatePath = './PlanillaCostos.xlsm';

  constructor(private prisma: PrismaService) {}

  async uploadFile(projectId: string, folder: string, file: Express.Multer.File) {
    // Verificar que el proyecto existe
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    // Crear estructura de directorios
    const projectDir = await this.ensureProjectDirectory(projectId, project.name);
    const folderPath = join(projectDir, folder);
    await fs.mkdir(folderPath, { recursive: true });

    // Generar nombre único si ya existe
    let filename = file.originalname;
    let filePath = join(folderPath, filename);
    let counter = 1;

    while (await this.fileExists(filePath)) {
      const ext = filename.substring(filename.lastIndexOf('.'));
      const name = filename.substring(0, filename.lastIndexOf('.'));
      filename = `${name}_${counter}${ext}`;
      filePath = join(folderPath, filename);
      counter++;
    }

    // Guardar archivo
    await fs.writeFile(filePath, file.buffer);

    return {
      success: true,
      filename,
      folder,
      size: file.size,
      uploadDate: new Date().toISOString(),
    };
  }

  async listFiles(projectId: string, folder: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const projectDir = this.getProjectDirectoryName(projectId, project.name);
    const folderPath = join(this.uploadsPath, projectDir, folder);

    try {
      await fs.access(folderPath);
      const files = await fs.readdir(folderPath);
      
      const fileDetails = await Promise.all(
        files.map(async (filename) => {
          const filePath = join(folderPath, filename);
          const stats = await fs.stat(filePath);
          return {
            filename,
            size: stats.size,
            uploadDate: stats.mtime.toISOString(),
          };
        })
      );

      return {
        folder,
        files: fileDetails,
        count: fileDetails.length,
      };
    } catch (error) {
      // Si la carpeta no existe, retornar vacío
      return {
        folder,
        files: [],
        count: 0,
      };
    }
  }

  async getFilePath(projectId: string, folder: string, filename: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const projectDir = this.getProjectDirectoryName(projectId, project.name);
    const filePath = join(this.uploadsPath, projectDir, folder, filename);

    try {
      await fs.access(filePath);
      return filePath;
    } catch (error) {
      throw new NotFoundException('Archivo no encontrado');
    }
  }

  async createFolderZip(projectId: string, folder: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const projectDir = this.getProjectDirectoryName(projectId, project.name);
    const folderPath = join(this.uploadsPath, projectDir, folder);
    const tempDir = join(this.uploadsPath, 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const zipPath = join(tempDir, `${folder}_${Date.now()}.zip`);
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve(zipPath));
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.directory(folderPath, false);
      archive.finalize();
    });
  }

  async createProjectZip(projectId: string): Promise<{ zipPath: string; projectName: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const projectDir = this.getProjectDirectoryName(projectId, project.name);
    const projectPath = join(this.uploadsPath, projectDir);
    const tempDir = join(this.uploadsPath, 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const zipPath = join(tempDir, `${projectDir}_${Date.now()}.zip`);
    const output = createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve({ zipPath, projectName: projectDir }));
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.directory(projectPath, projectDir);
      archive.finalize();
    });
  }

  getCostTemplatePath(): string {
    return this.templatePath;
  }

  async deleteFile(projectId: string, folder: string, filename: string) {
    const filePath = await this.getFilePath(projectId, folder, filename);
    await fs.unlink(filePath);
    
    return {
      success: true,
      message: 'Archivo eliminado exitosamente',
    };
  }

  async getProjectStructure(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const folders = ['Imagenes', 'AS-BUILT', 'Contrato', 'Costos', 'Firmados', 'Anexos', 'Otros'];
    const structure = await Promise.all(
      folders.map(async (folder) => {
        const files = await this.listFiles(projectId, folder);
        return {
          name: folder,
          ...files,
        };
      })
    );

    return {
      projectId,
      projectName: project.name,
      projectCode: project.code,
      folders: structure,
      totalFiles: structure.reduce((sum, folder) => sum + folder.count, 0),
    };
  }

  private async ensureProjectDirectory(projectId: string, projectName: string): Promise<string> {
    const projectDirName = this.getProjectDirectoryName(projectId, projectName);
    const projectPath = join(this.uploadsPath, projectDirName);
    await fs.mkdir(projectPath, { recursive: true });
    
    // Crear todas las subcarpetas
    const folders = ['Imagenes', 'AS-BUILT', 'Contrato', 'Costos', 'Firmados', 'Anexos', 'Otros'];
    await Promise.all(
      folders.map(folder => fs.mkdir(join(projectPath, folder), { recursive: true }))
    );
    
    return projectPath;
  }

  private getProjectDirectoryName(projectId: string, projectName: string): string {
    // Sanitizar el nombre del proyecto para usarlo como nombre de carpeta
    const sanitizedName = projectName.replace(/[<>:"/\\|?*]/g, '_');
    return `${projectId}_${sanitizedName}`;
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }
}
