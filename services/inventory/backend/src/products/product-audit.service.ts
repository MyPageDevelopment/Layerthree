import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

export interface AuditData {
  productId: string;
  productSku: string;
  productName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class ProductAuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Registra una acción de auditoría en la base de datos
   */
  async createAuditLog(data: AuditData) {
    try {
      return await this.prisma.productAudit.create({
        data: {
          productId: data.productId,
          productSku: data.productSku,
          productName: data.productName,
          action: data.action,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          userRole: data.userRole,
          changes: data.changes ? JSON.stringify(data.changes) : null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });
    } catch (error) {
      // Log del error pero no fallar la operación principal
      console.error('Error al crear registro de auditoría:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de auditoría de un producto específico
   */
  async getProductAuditHistory(productId: string) {
    return await this.prisma.productAudit.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Obtiene todos los registros de auditoría con filtros opcionales
   */
  async getAllAudits(filters?: {
    userId?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }) {
    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    return await this.prisma.productAudit.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
    });
  }

  /**
   * Obtiene estadísticas de auditoría
   */
  async getAuditStats() {
    const [totalAudits, auditsByAction, recentAudits] = await Promise.all([
      this.prisma.productAudit.count(),
      this.prisma.productAudit.groupBy({
        by: ['action'],
        _count: true,
      }),
      this.prisma.productAudit.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      totalAudits,
      auditsByAction,
      recentAudits,
    };
  }
}
