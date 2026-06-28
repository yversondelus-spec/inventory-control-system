import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters?: {
    usuarioId?: string;
    accion?: string;
    entidad?: string;
    desde?: Date;
    hasta?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.usuarioId) where.usuarioId = filters.usuarioId;
    if (filters?.accion) where.accion = filters.accion;
    if (filters?.entidad) where.entidad = filters.entidad;

    if (filters?.desde || filters?.hasta) {
      where.createdAt = {};
      if (filters.desde) where.createdAt.gte = filters.desde;
      if (filters.hasta) where.createdAt.lte = filters.hasta;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        include: {
          usuario: { select: { id: true, email: true, nombre: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit ?? 100,
        skip: filters?.offset ?? 0,
      }),
      this.prisma.auditoria.count({ where }),
    ]);

    return {
      logs,
      total,
      limit: filters?.limit ?? 100,
      offset: filters?.offset ?? 0,
      hasMore: (filters?.offset ?? 0) + (filters?.limit ?? 100) < total,
    };
  }

  /**
   * Get audit summary for dashboard
   */
  async getAuditSummary(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.auditoria.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        usuario: { select: { id: true, email: true, nombre: true } },
      },
    });

    // Group by action
    const byAccion = {
      POST: logs.filter(l => l.accion === 'POST').length,
      PUT: logs.filter(l => l.accion === 'PUT').length,
      PATCH: logs.filter(l => l.accion === 'PATCH').length,
      DELETE: logs.filter(l => l.accion === 'DELETE').length,
    };

    // Group by entity
    const byEntidad: Record<string, number> = {};
    logs.forEach((log) => {
      byEntidad[log.entidad] = (byEntidad[log.entidad] || 0) + 1;
    });

    // Top users
    const userMap = new Map<string, any>();
    logs.forEach((log) => {
      if (log.usuario) {
        const key = log.usuarioId || 'sistema';
        if (!userMap.has(key)) {
          userMap.set(key, { ...log.usuario, acciones: 0 });
        }
        userMap.get(key).acciones += 1;
      }
    });

    const topUsers = Array.from(userMap.values())
      .sort((a, b) => b.acciones - a.acciones)
      .slice(0, 10);

    // Daily trend
    const dailyTrend: Record<string, number> = {};
    logs.forEach((log) => {
      const day = log.createdAt.toISOString().split('T')[0];
      dailyTrend[day] = (dailyTrend[day] || 0) + 1;
    });

    return {
      periodo: `${days} días`,
      totalAcciones: logs.length,
      byAccion,
      byEntidad: Object.entries(byEntidad).map(([entidad, count]) => ({ entidad, count })),
      topUsers,
      dailyTrend: Object.entries(dailyTrend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, acciones]) => ({ fecha, acciones })),
    };
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(filters?: {
    usuarioId?: string;
    accion?: string;
    entidad?: string;
    desde?: Date;
    hasta?: Date;
  }): Promise<string> {
    const logs = await this.prisma.auditoria.findMany({
      where: {
        ...(filters?.usuarioId && { usuarioId: filters.usuarioId }),
        ...(filters?.accion && { accion: filters.accion }),
        ...(filters?.entidad && { entidad: filters.entidad }),
        ...(filters?.desde ||
          filters?.hasta) && {
          createdAt: {
            ...(filters?.desde && { gte: filters.desde }),
            ...(filters?.hasta && { lte: filters.hasta }),
          },
        },
      },
      include: {
        usuario: { select: { email: true, nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Generate CSV
    const headers = ['Fecha', 'Usuario', 'Email', 'Acción', 'Entidad', 'Entidad ID', 'IP', 'User Agent'];
    const rows = logs.map(log => [
      log.createdAt.toISOString(),
      log.usuario?.nombre ?? 'Sistema',
      log.usuario?.email ?? 'N/A',
      log.accion,
      log.entidad,
      log.entidadId ?? '—',
      log.ip ?? '—',
      log.userAgent ?? '—',
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
}
