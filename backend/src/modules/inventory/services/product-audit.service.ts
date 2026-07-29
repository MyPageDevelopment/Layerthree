import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
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
      console.error('Error al crear registro de auditoría:', error);
      throw error;
    }
  }

  async getProductAuditHistory(productId: string) {
    return await this.prisma.productAudit.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
  }

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
