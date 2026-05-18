import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { EstadoAlerta, PrioridadAlerta, TipoAlerta } from '@repo/shared-types';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: {
    estado?: EstadoAlerta;
    prioridad?: PrioridadAlerta;
    tipo?: TipoAlerta;
    productoId?: string;
    page?: number;
    limit?: number;
  }) {
    const { page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AlertaWhereInput = {
      ...(filters.estado && { estado: filters.estado }),
      ...(filters.prioridad && { prioridad: filters.prioridad }),
      ...(filters.tipo && { tipo: filters.tipo }),
      ...(filters.productoId && { productoId: filters.productoId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.alerta.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ prioridad: 'asc' }, { createdAt: 'desc' }],
        include: {
          producto: {
            select: {
              id: true,
              codigoProducto: true,
              descripcion: true,
              stockActual: true,
              unidadMedida: true,
              criticidad: true,
              categoria: {
                select: { nombre: true, color: true },
              },
            },
          },
        },
      }),
      this.prisma.alerta.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getSummary() {
    const [byPrioridad, byTipo, totalActivas] = await Promise.all([
      this.prisma.alerta.groupBy({
        by: ['prioridad'],
        where: { estado: 'ACTIVA' },
        _count: { id: true },
      }),
      this.prisma.alerta.groupBy({
        by: ['tipo'],
        where: { estado: 'ACTIVA' },
        _count: { id: true },
      }),
      this.prisma.alerta.count({ where: { estado: 'ACTIVA' } }),
    ]);

    return { totalActivas, byPrioridad, byTipo };
  }

  async acknowledge(id: string, userId: string) {
    const alerta = await this.prisma.alerta.findUnique({ where: { id } });
    if (!alerta) throw new NotFoundException(`Alerta ${id} no encontrada`);

    return this.prisma.alerta.update({
      where: { id },
      data: {
        estado: 'RECONOCIDA',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  async resolve(id: string) {
    const alerta = await this.prisma.alerta.findUnique({ where: { id } });
    if (!alerta) throw new NotFoundException(`Alerta ${id} no encontrada`);

    return this.prisma.alerta.update({
      where: { id },
      data: { estado: 'RESUELTA', resolvedAt: new Date() },
    });
  }

  async dismiss(id: string) {
    return this.prisma.alerta.update({
      where: { id },
      data: { estado: 'DESCARTADA' },
    });
  }
}