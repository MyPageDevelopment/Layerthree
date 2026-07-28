import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { ProjectStatus } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
  @ApiOperation({ summary: 'Crear nuevo proyecto (SUPER_ADMIN, GERENTE, JEFE)' })
  @ApiResponse({ status: 201, description: 'Proyecto creado exitosamente', type: ProjectResponseDto })
  @ApiResponse({ status: 409, description: 'El código del proyecto ya existe' })
  async create(@Body() createProjectDto: CreateProjectDto): Promise<ProjectResponseDto> {
    const project = await this.projectsService.create(createProjectDto);
    return plainToInstance(ProjectResponseDto, project, { excludeExtraneousValues: true });
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los proyectos' })
  @ApiQuery({ name: 'status', required: false, enum: ProjectStatus })
  @ApiResponse({ status: 200, description: 'Lista de proyectos', type: [ProjectResponseDto] })
  async findAll(@Query('status') status?: ProjectStatus): Promise<ProjectResponseDto[]> {
    const projects = await this.projectsService.findAll(status);
    return plainToInstance(ProjectResponseDto, projects, { excludeExtraneousValues: true });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener proyecto por ID' })
  @ApiResponse({ status: 200, description: 'Proyecto encontrado', type: ProjectResponseDto })
  @ApiResponse({ status: 404, description: 'Proyecto no encontrado' })
  async findOne(@Param('id') id: string): Promise<ProjectResponseDto> {
    const project = await this.projectsService.findOne(id);
    return plainToInstance(ProjectResponseDto, project, { excludeExtraneousValues: true });
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Obtener estadísticas del proyecto' })
  getStatistics(@Param('id') id: string) {
    return this.projectsService.getStatistics(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
  @ApiOperation({ summary: 'Actualizar proyecto (SUPER_ADMIN, GERENTE, JEFE)' })
  @ApiResponse({ status: 200, description: 'Proyecto actualizado', type: ProjectResponseDto })
  async update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto): Promise<ProjectResponseDto> {
    const project = await this.projectsService.update(id, updateProjectDto);
    return plainToInstance(ProjectResponseDto, project, { excludeExtraneousValues: true });
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
  @ApiOperation({ summary: 'Cambiar estado del proyecto (SUPER_ADMIN, GERENTE, JEFE)' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ProjectStatus,
  ) {
    return this.projectsService.updateStatus(id, status);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
  @ApiOperation({ summary: 'Eliminar proyecto (SUPER_ADMIN, GERENTE, JEFE)' })
  @ApiResponse({ status: 200, description: 'Proyecto eliminado exitosamente' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
