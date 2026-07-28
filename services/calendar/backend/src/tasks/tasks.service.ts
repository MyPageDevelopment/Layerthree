import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../availability/availability.service';
import { EmailService } from '../emails/email.service';
import { TaskUpdateTokenService } from '../task-update-tokens/task-update-tokens.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AssignUserDto } from './dto/assign-user.dto';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private availabilityService: AvailabilityService,
    private emailService: EmailService,
    private tokenService: TaskUpdateTokenService,
  ) {}

  async create(createTaskDto: CreateTaskDto) {
    console.log('[TasksService] create() - participantIds:', createTaskDto.participantIds);
    console.log('[TasksService] create() - participantIds type:', typeof createTaskDto.participantIds);
    console.log('[TasksService] create() - participantIds length:', createTaskDto.participantIds?.length);
    
    // Verificar que el código sea único
    const existingTask = await this.prisma.task.findUnique({
      where: { code: createTaskDto.code },
    });

    if (existingTask) {
      throw new ConflictException(
        `Ya existe una tarea con el código ${createTaskDto.code}`,
      );
    }

    // Verificar que el proyecto exista
    const project = await this.prisma.project.findUnique({
      where: { id: createTaskDto.projectId },
    });

    if (!project) {
      throw new NotFoundException(
        `Proyecto con ID ${createTaskDto.projectId} no encontrado`,
      );
    }

    // Verificar fechas del proyecto
    const taskStart = new Date(createTaskDto.startDate);
    const taskEnd = new Date(createTaskDto.endDate);
    const projectStart = new Date(project.startDate);
    const projectEnd = new Date(project.endDate);

    if (taskStart < projectStart || taskEnd > projectEnd) {
      throw new BadRequestException(
        'Las fechas de la tarea deben estar dentro del rango del proyecto',
      );
    }

    // Verificar tarea padre si existe
    if (createTaskDto.parentTaskId) {
      const parentTask = await this.prisma.task.findUnique({
        where: { id: createTaskDto.parentTaskId },
      });

      if (!parentTask) {
        throw new NotFoundException(
          `Tarea padre con ID ${createTaskDto.parentTaskId} no encontrada`,
        );
      }

      if (parentTask.projectId !== createTaskDto.projectId) {
        throw new BadRequestException(
          'La tarea padre debe pertenecer al mismo proyecto',
        );
      }
    }

    // Crear tarea
    const task = await this.prisma.task.create({
      data: {
        code: createTaskDto.code,
        title: createTaskDto.title,
        description: createTaskDto.description,
        status: createTaskDto.status,
        priority: createTaskDto.priority,
        projectId: createTaskDto.projectId,
        startDate: createTaskDto.startDate,
        endDate: createTaskDto.endDate,
        estimatedHours: createTaskDto.estimatedHours,
        progress: createTaskDto.progress || 0,
        parentTaskId: createTaskDto.parentTaskId,
        milestoneId: createTaskDto.milestoneId,
        shiftTypeId: createTaskDto.shiftTypeId,
      },
      include: {
        project: {
          select: { id: true, code: true, name: true },
        },
        parentTask: {
          select: { id: true, code: true, title: true },
        },
        milestone: {
          select: { id: true, name: true },
        },
        shiftType: {
          select: { id: true, code: true, name: true, color: true },
        },
      },
    });

    // Asignar participantes si se proporcionaron
    if (createTaskDto.participantIds && createTaskDto.participantIds.length > 0) {
      console.log('[TasksService] Asignando participantes:', createTaskDto.participantIds);
      
      // Verificar que todos los usuarios existan en la base de datos local
      const existingUsers = await this.prisma.user.findMany({
        where: {
          id: { in: createTaskDto.participantIds },
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      console.log('[TasksService] Usuarios encontrados:', existingUsers.length, 'de', createTaskDto.participantIds.length);

      if (existingUsers.length !== createTaskDto.participantIds.length) {
        const missingIds = createTaskDto.participantIds.filter(
          (id) => !existingUsers.find((u) => u.id === id)
        );
        console.log('[TasksService] Usuarios faltantes:', missingIds);
        throw new BadRequestException(
          `Los siguientes usuarios no existen o están inactivos: ${missingIds.join(', ')}`
        );
      }

      console.log('[TasksService] Creando asignaciones...');
      
      // OPTIMIZACIÓN: Crear todas las asignaciones en una sola transacción
      const assignmentPromises = createTaskDto.participantIds.map((userId) =>
        this.prisma.taskAssignment.create({
          data: {
            taskId: task.id,
            userId: userId,
          },
        }),
      );
      await Promise.all(assignmentPromises);
      
      console.log('[TasksService] Asignaciones creadas exitosamente');

      // OPTIMIZACIÓN: Crear tokens en paralelo (ya tenemos existingUsers)
      const tokenPromises = createTaskDto.participantIds.map((userId) =>
        this.tokenService.createToken(task.id, userId),
      );
      const tokens = await Promise.all(tokenPromises);

      // Enviar correos si está habilitado
      if (createTaskDto.sendEmail && this.emailService.isConfigured()) {
        // Obtener el primer usuario activo para el campo "assignedBy"
        const currentUser = existingUsers[0] || null;
        
        // OPTIMIZACIÓN: Enviar todos los correos en paralelo
        const emailPromises = existingUsers
          .filter((user) => user.email)
          .map((user) => {
            const userToken = tokens.find(
              (t) => t.userId === user.id,
            );
            
            return this.emailService.sendTaskAssignmentNotification({
              taskTitle: task.title,
              taskDescription: task.description || '',
              projectName: task.project.name,
              milestoneName: task.milestone?.name,
              priority: task.priority,
              dueDate: new Date(task.endDate),
              assignedBy: currentUser?.name || 'Sistema',
              recipientEmail: user.email,
              recipientName: user.name,
              updateToken: userToken?.token, // Incluir token para acciones rápidas
              shiftTypeName: task.shiftType?.name,
              shiftTypeColor: task.shiftType?.color,
            });
          });
        
        await Promise.all(emailPromises);
      }
    }

    return task;
  }

  async findAll(projectId?: string, status?: TaskStatus, userId?: string) {
    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.status = status;
    }

    // Filtrar por usuario participante
    if (userId) {
      where.assignments = {
        some: {
          userId: userId,
        },
      };
    }

    return this.prisma.task.findMany({
      where,
      include: {
        project: {
          select: { id: true, code: true, name: true },
        },
        shiftType: {
          select: { id: true, code: true, name: true, color: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, email: true, name: true, role: true },
            },
          },
        },
        _count: {
          select: { assignments: true, subtasks: true, comments: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        parentTask: {
          select: { id: true, code: true, title: true, status: true },
        },
        subtasks: {
          select: { id: true, code: true, title: true, status: true, progress: true },
        },
        milestone: true,
        shiftType: {
          select: { id: true, code: true, name: true, color: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, email: true, name: true, role: true },
            },
          },
        },
        // comments: {
        //   include: {
        //     user: {
        //       select: { id: true, email: true, name: true },
        //     },
        //   },
        //   orderBy: { createdAt: 'desc' },
        //   take: 10,
        // },
      },
    });

    if (!task) {
      throw new NotFoundException(`Tarea con ID ${id} no encontrada`);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Tarea con ID ${id} no encontrada`);
    }

    // Si se actualiza el código, verificar que sea único
    if (updateTaskDto.code && updateTaskDto.code !== task.code) {
      const existingTask = await this.prisma.task.findUnique({
        where: { code: updateTaskDto.code },
      });

      if (existingTask) {
        throw new ConflictException(
          `Ya existe una tarea con el código ${updateTaskDto.code}`,
        );
      }
    }

    return this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
      include: {
        project: true,
        shiftType: {
          select: { id: true, code: true, name: true, color: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    });
  }

  async updateStatus(id: string, status: TaskStatus) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Tarea con ID ${id} no encontrada`);
    }

    return this.prisma.task.update({
      where: { id },
      data: { status },
      include: {
        project: true,
        shiftType: {
          select: { id: true, code: true, name: true, color: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    });
  }

  async remove(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });

    if (!task) {
      throw new NotFoundException(`Tarea con ID ${id} no encontrada`);
    }

    await this.prisma.task.delete({ where: { id } });

    return { message: 'Tarea eliminada exitosamente' };
  }

  /**
   * ASIGNAR USUARIOS A TAREA CON VALIDACIÓN DE DISPONIBILIDAD
   */
  async assignUsers(taskId: string, assignUserDto: AssignUserDto) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException(`Tarea con ID ${taskId} no encontrada`);
    }

    const startDate = new Date(assignUserDto.startDate);
    const endDate = new Date(assignUserDto.endDate);

    // Validar fechas dentro del rango de la tarea
    if (startDate < new Date(task.startDate) || endDate > new Date(task.endDate)) {
      throw new BadRequestException(
        'Las fechas de asignación deben estar dentro del rango de la tarea',
      );
    }

    // VALIDAR DISPONIBILIDAD DE CADA USUARIO
    const conflicts: any[] = [];

    // OPTIMIZACIÓN: Obtener todos los usuarios de una vez
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: assignUserDto.userIds },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Verificar que todos los usuarios existan
    if (users.length !== assignUserDto.userIds.length) {
      const foundIds = users.map(u => u.id);
      const missingIds = assignUserDto.userIds.filter(id => !foundIds.includes(id));
      throw new NotFoundException(
        `Usuarios no encontrados: ${missingIds.join(', ')}`,
      );
    }

    // OPTIMIZACIÓN: Verificar disponibilidad en paralelo
    const availabilityChecks = await Promise.all(
      users.map(async (user) => {
        const availability = await this.availabilityService.checkUserAvailability(
          user.id,
          startDate,
          endDate,
          taskId, // Excluir la tarea actual si se está actualizando
        );

        return {
          userId: user.id,
          userEmail: user.email,
          availability,
        };
      }),
    );

    // Filtrar conflictos
    for (const check of availabilityChecks) {
      if (check.availability.hasConflict) {
        conflicts.push({
          userId: check.userId,
          userEmail: check.userEmail,
          conflicts: check.availability.conflicts,
        });
      }
    }

    // Si hay conflictos, devolver error detallado
    if (conflicts.length > 0) {
      throw new BadRequestException({
        message: 'Algunos usuarios tienen conflictos de disponibilidad',
        conflicts,
      });
    }

    // Eliminar asignaciones previas de estos usuarios
    await this.prisma.taskAssignment.deleteMany({
      where: {
        taskId,
        userId: { in: assignUserDto.userIds },
      },
    });

    // Crear nuevas asignaciones
    const assignments = await Promise.all(
      assignUserDto.userIds.map((userId) =>
        this.prisma.taskAssignment.create({
          data: {
            taskId,
            userId,
            role: assignUserDto.role,
            allocatedHours: assignUserDto.allocatedHours,
            startDate: assignUserDto.startDate,
            endDate: assignUserDto.endDate,
          },
          include: {
            user: {
              select: { id: true, email: true, name: true, role: true },
            },
          },
        }),
      ),
    );

    return {
      message: `${assignments.length} usuario(s) asignado(s) exitosamente`,
      assignments,
    };
  }

  async getTaskStatistics(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignments: true,
        subtasks: true,
      },
    });

    if (!task) {
      throw new NotFoundException(`Tarea con ID ${taskId} no encontrada`);
    }

    // Calcular horas totales registradas
    const timeEntries = await this.prisma.timeEntry.findMany({
      where: { taskId },
    });

    const actualHours = timeEntries.reduce((sum, entry) => {
      if (entry.endTime) {
        const start = new Date(entry.startTime);
        const end = new Date(entry.endTime);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return sum + hours;
      }
      return sum;
    }, 0);

    // Calcular progreso de subtareas
    const subtaskProgress = task.subtasks.length > 0
      ? task.subtasks.reduce((sum, subtask) => sum + subtask.progress, 0) / task.subtasks.length
      : 0;

    return {
      estimatedHours: task.estimatedHours,
      actualHours: Math.round(actualHours * 100) / 100,
      hoursRemaining: Math.max(0, task.estimatedHours - actualHours),
      progress: task.progress,
      subtaskCount: task.subtasks.length,
      subtaskProgress: Math.round(subtaskProgress),
      assignmentCount: task.assignments.length,
      status: task.status,
    };
  }

  /**
   * GESTIÓN DE PARTICIPANTES
   */
  
  async findUserTasks(userId: string, status?: TaskStatus) {
    const where: any = {
      assignments: {
        some: {
          userId: userId,
        },
      },
    };

    if (status) {
      where.status = status;
    }

    return this.prisma.task.findMany({
      where,
      include: {
        project: {
          select: { id: true, code: true, name: true, status: true },
        },
        assignments: {
          include: {
            user: {
              select: { id: true, email: true, name: true, role: true },
            },
          },
        },
        milestone: {
          select: { id: true, name: true, dueDate: true },
        },
        _count: {
          select: { subtasks: true, comments: true },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { priority: 'desc' },
      ],
    });
  }

  async addParticipant(taskId: string, userId: string) {
    // Verificar que la tarea existe
    const task = await this.prisma.task.findUnique({ 
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException(`Tarea con ID ${taskId} no encontrada`);
    }

    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${userId} no encontrado`);
    }

    // Verificar si ya está asignado
    const existingAssignment = await this.prisma.taskAssignment.findUnique({
      where: {
        taskId_userId: { taskId, userId },
      },
    });

    if (existingAssignment) {
      throw new ConflictException('El usuario ya es participante de esta tarea');
    }

    // Crear la asignación
    const assignment = await this.prisma.taskAssignment.create({
      data: {
        taskId,
        userId,
        role: 'Participante',
        startDate: task.startDate,
        endDate: task.endDate,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });

    return {
      message: 'Participante agregado exitosamente',
      assignment,
    };
  }

  async removeParticipant(taskId: string, userId: string) {
    // Verificar que existe la asignación
    const assignment = await this.prisma.taskAssignment.findUnique({
      where: {
        taskId_userId: { taskId, userId },
      },
    });

    if (!assignment) {
      throw new NotFoundException('El usuario no es participante de esta tarea');
    }

    await this.prisma.taskAssignment.delete({
      where: {
        taskId_userId: { taskId, userId },
      },
    });

    return { message: 'Participante eliminado exitosamente' };
  }

  async getParticipants(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignments: {
          include: {
            user: {
              select: { 
                id: true, 
                email: true, 
                name: true, 
                role: true,
                department: true,
                position: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Tarea con ID ${taskId} no encontrada`);
    }

    return {
      taskId: task.id,
      taskCode: task.code,
      taskTitle: task.title,
      participants: task.assignments.map(a => ({
        assignmentId: a.id,
        role: a.role,
        allocatedHours: a.allocatedHours,
        user: a.user,
        assignedAt: a.assignedAt,
      })),
      totalParticipants: task.assignments.length,
    };
  }
}
