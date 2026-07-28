import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShiftTypeDto } from './dto/create-shift-type.dto';
import { UpdateShiftTypeDto } from './dto/update-shift-type.dto';

@Injectable()
export class ShiftTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createShiftTypeDto: CreateShiftTypeDto) {
    // Verificar si el código ya existe
    const existing = await this.prisma.shiftType.findUnique({
      where: { code: createShiftTypeDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un tipo de jornada con el código ${createShiftTypeDto.code}`,
      );
    }

    return this.prisma.shiftType.create({
      data: createShiftTypeDto,
    });
  }

  async findAll(includeInactive = false) {
    return this.prisma.shiftType.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const shiftType = await this.prisma.shiftType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { workSchedules: true },
        },
      },
    });

    if (!shiftType) {
      throw new NotFoundException(`Tipo de jornada con ID ${id} no encontrado`);
    }

    return shiftType;
  }

  async update(id: string, updateShiftTypeDto: UpdateShiftTypeDto) {
    await this.findOne(id); // Verificar existencia

    // Si se cambia el código, verificar que no exista otro con ese código
    if (updateShiftTypeDto.code) {
      const existing = await this.prisma.shiftType.findFirst({
        where: {
          code: updateShiftTypeDto.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Ya existe otro tipo de jornada con el código ${updateShiftTypeDto.code}`,
        );
      }
    }

    return this.prisma.shiftType.update({
      where: { id },
      data: updateShiftTypeDto,
    });
  }

  async remove(id: string) {
    const shiftType = await this.findOne(id);

    // Verificar si hay horarios asociados
    const scheduleCount = await this.prisma.workSchedule.count({
      where: { shiftTypeId: id },
    });

    if (scheduleCount > 0) {
      throw new ConflictException(
        `No se puede eliminar el tipo de jornada porque tiene ${scheduleCount} horario(s) asociado(s). Desactívalo en su lugar.`,
      );
    }

    return this.prisma.shiftType.delete({
      where: { id },
    });
  }
}
