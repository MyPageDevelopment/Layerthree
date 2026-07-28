import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ProjectFilesController } from './project-files.controller';
import { ProjectFilesService } from './project-files.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    MulterModule.register({
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB máximo
      },
    }),
  ],
  controllers: [ProjectFilesController],
  providers: [ProjectFilesService, PrismaService],
  exports: [ProjectFilesService],
})
export class ProjectFilesModule {}
