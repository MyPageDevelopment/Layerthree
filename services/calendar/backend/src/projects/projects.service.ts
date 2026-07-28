import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectStatus } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto) {
    // Verificar que el código del proyecto sea único
    const existing = await this.prisma.project.findUnique({
      where: { code: createProjectDto.code },
    });

    if (existing) {
      throw new ConflictException('Ya existe un proyecto con ese código');
    }

    // Verificar que el owner existe
    const owner = await this.prisma.user.findUnique({
      where: { id: createProjectDto.ownerId },
    });

    if (!owner) {
      throw new NotFoundException('El usuario propietario no existe');
    }

    return this.prisma.project.create({
      data: {
        ...createProjectDto,
        startDate: createProjectDto.startDate ? new Date(createProjectDto.startDate) : null,
        endDate: createProjectDto.endDate ? new Date(createProjectDto.endDate) : null,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(status?: ProjectStatus) {
    return this.prisma.project.findMany({
      where: status ? { status } : undefined,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: true,
            milestones: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        tasks: {
          include: {
            assignments: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        milestones: {
          include: {
            _count: {
              select: {
                tasks: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        resources: {
          include: {
            resource: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto) {
    await this.findOne(id); // Verifica que existe

    if (updateProjectDto.code) {
      const existing = await this.prisma.project.findFirst({
        where: {
          code: updateProjectDto.code,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('Ya existe un proyecto con ese código');
      }
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        ...updateProjectDto,
        startDate: updateProjectDto.startDate ? new Date(updateProjectDto.startDate) : undefined,
        endDate: updateProjectDto.endDate ? new Date(updateProjectDto.endDate) : undefined,
      },
      include: {
        owner: true,
        manager: true,
      },
    });
  }

  async updateStatus(id: string, status: ProjectStatus) {
    await this.findOne(id);

    return this.prisma.project.update({
      where: { id },
      data: { status },
      include: {
        manager: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.project.delete({
      where: { id },
    });
  }

  /**
   * Obtener estadísticas del proyecto
   */
  async getStatistics(id: string) {
    const project = await this.findOne(id);

    const stats = await this.prisma.task.groupBy({
      by: ['status'],
      where: { projectId: id },
      _count: true,
    });

    const completionRate =
      project.tasks.length > 0
        ? (stats.find((s) => s.status === 'COMPLETED')?._count || 0) / project.tasks.length * 100
        : 0;

    return {
      projectId: id,
      totalTasks: project.tasks.length,
      tasksByStatus: stats,
      completionRate: Math.round(completionRate),
      estimatedHours: project.estimatedHours || 0,
      actualHours: project.actualHours,
      budget: project.budget || 0,
      milestonesCount: project.milestones.length,
    };
  }
}
