import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const allowedModulesJson = createUserDto.allowedModules 
      ? JSON.stringify(createUserDto.allowedModules)
      : null;

    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: hashedPassword,
        name: createUserDto.name,
        role: createUserDto.role,
        allowedModules: allowedModulesJson,
      },
    });

    const { password: _, ...result } = user;
    return {
      ...result,
      allowedModules: result.allowedModules ? JSON.parse(result.allowedModules) : [],
    };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users.map(({ password: _, ...user }) => ({
      ...user,
      allowedModules: user.allowedModules ? JSON.parse(user.allowedModules) : [],
    }));
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { password: _, ...result } = user;
    return {
      ...result,
      allowedModules: result.allowedModules ? JSON.parse(result.allowedModules) : [],
    };
  }

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      return null;
    }

    return {
      ...user,
      allowedModules: user.allowedModules ? JSON.parse(user.allowedModules) : [],
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    if (updateUserDto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const allowedModulesJson = updateUserDto.allowedModules 
      ? JSON.stringify(updateUserDto.allowedModules)
      : undefined;

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: updateUserDto.email,
        password: updateUserDto.password,
        name: updateUserDto.name,
        role: updateUserDto.role,
        isActive: updateUserDto.isActive,
        allowedModules: allowedModulesJson,
      },
    });

    const { password: _, ...result } = user;
    return {
      ...result,
      allowedModules: result.allowedModules ? JSON.parse(result.allowedModules) : [],
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    
    const user = await this.prisma.user.delete({
      where: { id },
    });

    const { password: _, ...result } = user;
    return result;
  }

  async updateResetToken(id: string, token: string, expires: Date) {
    return this.prisma.user.update({
      where: { id },
      data: {
        resetToken: token,
        resetTokenExpires: expires,
      },
    });
  }

  async updatePasswordAndClearToken(id: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });
  }
}
