import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { TaskStatus } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { TaskAssignmentGuard } from '../common/guards/task-assignment.guard';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
  @ApiOperation({ summary: 'Crear nueva tarea (SUPER_ADMIN, GERENTE, JEFE)' })
  @ApiResponse({ status: 201, description: 'Tarea creada exitosamente' })
  @ApiResponse({ status: 409, description: 'El código de la tarea ya existe' })
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las tareas' })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'userId', required: false, description: 'Filtrar tareas donde el usuario es participante' })
  findAll(@Query(new ValidationPipe({ transform: true })) query: TaskQueryDto) {
    return this.tasksService.findAll(query.projectId, query.status, query.userId);
  }

  @Get('user/:userId/assigned')
  @ApiOperation({ summary: 'Listar tareas asignadas a un usuario específico' })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  findUserTasks(
    @Param('userId') userId: string,
    @Query('status') status?: TaskStatus,
  ) {
    return this.tasksService.findUserTasks(userId, status);
  }

  @Get(':id/participants')
  @ApiOperation({ summary: 'Listar participantes de una tarea' })
  getParticipants(@Param('id') taskId: string) {
    return this.tasksService.getParticipants(taskId);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Obtener estadísticas de la tarea' })
  getStatistics(@Param('id') id: string) {
    return this.tasksService.getTaskStatistics(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tarea por ID' })
  @ApiResponse({ status: 404, description: 'Tarea no encontrada' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Post(':id/assign')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
  @ApiOperation({ summary: 'Asignar usuarios a la tarea con validación de disponibilidad (SUPER_ADMIN, GERENTE, JEFE)' })
  @ApiResponse({ status: 200, description: 'Usuarios asignados exitosamente' })
  @ApiResponse({ status: 400, description: 'Conflictos de disponibilidad detectados' })
  assignUsers(@Param('id') id: string, @Body() assignUserDto: AssignUserDto) {
    return this.tasksService.assignUsers(id, assignUserDto);
  }

  @Post(':id/participants/:userId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
  @ApiOperation({ summary: 'Agregar un participante a la tarea (SUPER_ADMIN, GERENTE, JEFE)' })
  @ApiResponse({ status: 201, description: 'Participante agregado exitosamente' })
  addParticipant(
    @Param('id') taskId: string,
    @Param('userId') userId: string,
  ) {
    return this.tasksService.addParticipant(taskId, userId);
  }

  @Delete(':id/participants/:userId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
  @ApiOperation({ summary: 'Quitar un participante de la tarea (SUPER_ADMIN, GERENTE, JEFE)' })
  @ApiResponse({ status: 200, description: 'Participante eliminado exitosamente' })
  removeParticipant(
    @Param('id') taskId: string,
    @Param('userId') userId: string,
  ) {
    return this.tasksService.removeParticipant(taskId, userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard, TaskAssignmentGuard)
  @Roles('SUPER_ADMIN', 'GERENTE', 'JEFE', 'TECNICO')
  @ApiOperation({ summary: 'Actualizar tarea (TECNICOS solo pueden cambiar estado si están asignados)' })
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard, TaskAssignmentGuard)
  @Roles('SUPER_ADMIN', 'GERENTE', 'JEFE', 'TECNICO')
  @ApiOperation({ summary: 'Cambiar estado de tarea (disponible para todos los roles)' })
  @ApiResponse({ status: 200, description: 'Estado actualizado exitosamente' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: TaskStatus,
  ) {
    return this.tasksService.updateStatus(id, status);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'GERENTE', 'JEFE')
  @ApiOperation({ summary: 'Eliminar tarea (SUPER_ADMIN, GERENTE, JEFE)' })
  @ApiResponse({ status: 200, description: 'Tarea eliminada exitosamente' })
  remove(@Param('id') id: string) {
    return this.tasksService.remove(id);
  }
}
