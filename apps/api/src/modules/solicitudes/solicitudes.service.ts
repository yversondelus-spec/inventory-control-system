import { Injectable, NotFoundException } from '@nestjs/common';
import { EstadoSolicitud } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SolicitudesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: { estado?: string; limit?: number }) {
    const { limit = 500 } = filters;
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
    grupoId?: string;
  }) {
    return this.prisma.solicitudReposicion.create({
      data: {
        productoId: data.productoId,
        alertaId: data.alertaId,
        cantidad: data.cantidad,
        prioridad: data.prioridad ?? 'NORMAL',
        notas: data.notas,
        creadoPor: data.creadoPor,
        grupoId: data.grupoId ?? uuidv4(),
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

  async createGrupo(items: Array<{
    productoId: string;
    cantidad: number;
    prioridad?: string;
    notas?: string;
    creadoPor?: string;
  }>) {
    const grupoId = uuidv4();
    const created = [];

    for (const item of items) {
      const sol = await this.prisma.solicitudReposicion.create({
        data: {
          productoId: item.productoId,
          cantidad: item.cantidad,
          prioridad: item.prioridad ?? 'NORMAL',
          notas: item.notas,
          creadoPor: item.creadoPor,
          grupoId,
          estado: 'PENDIENTE' as EstadoSolicitud,
        },
        include: {
          producto: {
            select: { codigoProducto: true, descripcion: true, unidadMedida: true },
          },
        },
      });
      created.push(sol);
    }

    return { grupoId, items: created, total: created.length };
  }

  async updateEstado(id: string, estado: EstadoSolicitud, motivoRechazo?: string) {
    const solicitud = await this.prisma.solicitudReposicion.findUnique({ where: { id } });
    if (!solicitud) throw new NotFoundException(`Solicitud ${id} no encontrada`);

    return this.prisma.solicitudReposicion.update({
      where: { id },
      data: {
        estado,
        ...(motivoRechazo && { motivoRechazo }),
      },
      include: {
        producto: {
          select: { codigoProducto: true, descripcion: true, unidadMedida: true },
        },
      },
    });
  }

  async updateEstadoGrupo(grupoId: string, estado: EstadoSolicitud, motivoRechazo?: string) {
    const solicitudes = await this.prisma.solicitudReposicion.findMany({
      where: { grupoId },
    });
    if (solicitudes.length === 0) throw new NotFoundException(`Grupo ${grupoId} no encontrado`);

    await this.prisma.solicitudReposicion.updateMany({
      where: { grupoId },
      data: {
        estado,
        ...(motivoRechazo && { motivoRechazo }),
      },
    });

    return { grupoId, estado, total: solicitudes.length };
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
      where: { estado: { in: ['PENDIENTE', 'EN_PROCESO_COMPRA'] as EstadoSolicitud[] } },
      select: { productoId: true },
    });

    const productosConSolicitud = new Set(existentes.map(s => s.productoId));
    const nuevas = alertas.filter(a => !productosConSolicitud.has(a.productoId));
    const grupoId = uuidv4();

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
          grupoId,
          notas: `Generada automáticamente desde alerta: ${alerta.mensaje}`,
        },
      });
      creadas++;
    }

    return { creadas, total: alertas.length };
  }

  async getSummary() {
    const [pendientes, enProcesoCompra, completadas, rechazadas] = await this.prisma.$transaction([
      this.prisma.solicitudReposicion.count({ where: { estado: 'PENDIENTE' as EstadoSolicitud } }),
      this.prisma.solicitudReposicion.count({ where: { estado: 'EN_PROCESO_COMPRA' as EstadoSolicitud } }),
      this.prisma.solicitudReposicion.count({ where: { estado: 'COMPLETADA' as EstadoSolicitud } }),
      this.prisma.solicitudReposicion.count({ where: { estado: 'RECHAZADA' as EstadoSolicitud } }),
    ]);

    return { pendientes, enProcesoCompra, completadas, rechazadas };
  }
}