import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMovements(limit = 100, tipo?: string) {
    const where: any = {};
    if (tipo) where.tipo = tipo;

    const movimientos = await this.prisma.movimiento.findMany({
      where,
      include: {
        producto: {
          select: {
            codigoProducto: true,
            descripcion: true,
            unidadMedida: true,
            categoria: { select: { nombre: true, color: true } },
          },
        },
      },
      orderBy: { fecha: 'desc' },
      take: limit,
    });

    return { success: true, data: movimientos };
  }

  async getSummary() {
    const [total, ajustesPos, ajustesNeg, uploads] = await Promise.all([
      this.prisma.movimiento.count(),
      this.prisma.movimiento.count({ where: { tipo: 'AJUSTE_POSITIVO' } }),
      this.prisma.movimiento.count({ where: { tipo: 'AJUSTE_NEGATIVO' } }),
      this.prisma.movimiento.groupBy({
        by: ['uploadId'],
        _count: { id: true },
        where: { uploadId: { not: null } },
      }),
    ]);

    return {
      success: true,
      data: { total, ajustesPositivos: ajustesPos, ajustesNegativos: ajustesNeg, totalUploads: uploads.length },
    };
  }
}