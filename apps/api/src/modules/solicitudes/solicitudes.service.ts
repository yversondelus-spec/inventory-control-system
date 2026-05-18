import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoSolicitud } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SolicitudesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: { estado?: string; limit?: number }) {
    const { limit = 100 } = filters;

    const where: any = {};
    if (filters.estado) where.estado = filters.estado as EstadoSolicitud;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.solicitudReposicion.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          producto: {
            select: {
              id: true,
              codigoProducto: true,
              descripcion: true,
              stockActual: true,
              stockMinimo: true,
              unidadMedida: true,
              criticidad: true,
              categoria: { select: { nombre: true, color: true } },
            },
          },
        },
      }),
      this.prisma.solicitudReposicion.count({ where }),
    ]);

    return { data, meta: { total } };
  }

  async create(data: {
    productoId: string;
    alertaId?: string;
    cantidad: number;
    prioridad?: string;
    notas?: string;
    creadoPor?: string;
  }) {
    return this.prisma.solicitudReposicion.create({
      data: {
        productoId: data.productoId,
        alertaId: data.alertaId,
        cantidad: data.cantidad,
        prioridad: data.prioridad ?? 'NORMAL',
        notas: data.notas,
        creadoPor: data.creadoPor,
        estado: 'PENDIENTE' as EstadoSolicitud,
      },
      include: {
        producto: {
          select: {
            codigoProducto: true,
            descripcion: true,
            unidadMedida: true,
          },
        },
      },
    });
  }

  async updateEstado(id: string, estado: EstadoSolicitud, notas?: string) {
    const solicitud = await this.prisma.solicitudReposicion.findUnique({ where: { id } });
    if (!solicitud) throw new NotFoundException(`Solicitud ${id} no encontrada`);

    return this.prisma.solicitudReposicion.update({
      where: { id },
      data: { estado, ...(notas && { notas }) },
      include: {
        producto: {
          select: { codigoProducto: true, descripcion: true, unidadMedida: true },
        },
      },
    });
  }

  async createFromAlertas() {
    const alertas = await this.prisma.alerta.findMany({
      where: {
        estado: 'ACTIVA',
        tipo: { in: ['STOCK_BAJO', 'REPOSICION_URGENTE', 'QUIEBRE_STOCK'] },
      },
      include: {
        producto: { select: { id: true, stockMinimo: true, stockActual: true, puntoPedido: true } },
      },
    });

    const existentes = await this.prisma.solicitudReposicion.findMany({
      where: { estado: { in: ['PENDIENTE', 'ENVIADA', 'EN_PROCESO'] as EstadoSolicitud[] } },
      select: { productoId: true },
    });

    const productosConSolicitud = new Set(existentes.map(s => s.productoId));
    const nuevas = alertas.filter(a => !productosConSolicitud.has(a.productoId));

    let creadas = 0;
    for (const alerta of nuevas) {
      const cantidadSugerida = Math.max(
        alerta.producto.stockMinimo - alerta.producto.stockActual,
        alerta.producto.stockMinimo,
      );

      await this.prisma.solicitudReposicion.create({
        data: {
          productoId: alerta.productoId,
          alertaId: alerta.id,
          cantidad: cantidadSugerida,
          prioridad: alerta.tipo === 'QUIEBRE_STOCK' ? 'URGENTE' : 'NORMAL',
          estado: 'PENDIENTE' as EstadoSolicitud,
          notas: `Generada automáticamente desde alerta: ${alerta.mensaje}`,
        },
      });
      creadas++;
    }

    return { creadas, total: alertas.length };
  }

  async getSummary() {
    const [pendientes, enviadas, enProceso, completadas] = await this.prisma.$transaction([
      this.prisma.solicitudReposicion.count({ where: { estado: 'PENDIENTE' as EstadoSolicitud } }),
      this.prisma.solicitudReposicion.count({ where: { estado: 'ENVIADA' as EstadoSolicitud } }),
      this.prisma.solicitudReposicion.count({ where: { estado: 'EN_PROCESO' as EstadoSolicitud } }),
      this.prisma.solicitudReposicion.count({ where: { estado: 'COMPLETADA' as EstadoSolicitud } }),
    ]);

    return { pendientes, enviadas, enProceso, completadas };
  }
}