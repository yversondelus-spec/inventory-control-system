import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type { CreateProductDto, ProductFilterDto, UpdateProductDto } from './dto/products.dto';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: ProductFilterDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = filters;
    const skip = (page - 1) * limit;

    const where = this.buildWhereClause(filters);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.producto.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          categoria: { select: { id: true, nombre: true, color: true } },
          proveedor: { select: { id: true, nombre: true, leadTimeDias: true } },
          _count: { select: { alertas: { where: { estado: 'ACTIVA' } } } },
        },
      }),
      this.prisma.producto.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    return this.prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        proveedor: true,
        alertas: {
          where: { estado: 'ACTIVA' },
          orderBy: { prioridad: 'asc' },
          take: 10,
        },
        movimientos: {
          orderBy: { fecha: 'desc' },
          take: 50,
        },
      },
    });
  }

  async findByCodigoSap(codigoSap: string) {
    return this.prisma.producto.findUnique({ where: { codigoSap } });
  }

  async findCritical() {
    return this.prisma.producto.findMany({
      where: {
        activo: true,
        OR: [
          { stockActual: { lte: 0 } },
          { criticidad: { in: ['CRITICO', 'ALTO'] } },
        ],
      },
      include: {
        categoria: { select: { nombre: true, color: true } },
        proveedor: { select: { nombre: true, leadTimeDias: true } },
      },
      orderBy: [{ criticidad: 'asc' }, { stockActual: 'asc' }],
      take: 100,
    });
  }

  async findAtRisk() {
    return this.prisma.producto.findMany({
      where: {
        activo: true,
        puntoPedido: { gt: 0 },
        stockActual: { lte: this.prisma.producto.fields.puntoPedido },
      },
      include: {
        categoria: { select: { nombre: true } },
        proveedor: { select: { nombre: true, leadTimeDias: true } },
      },
      orderBy: { diasCobertura: 'asc' },
    });
  }

  async create(data: CreateProductDto) {
    return this.prisma.producto.create({
      data: {
        codigoProducto: data.codigoProducto,
        codigoSap: data.codigoSap,
        descripcion: data.descripcion,
        unidadMedida: data.unidadMedida ?? 'UN',
        categoriaId: data.categoriaId,
        proveedorId: data.proveedorId,
        stockActual: data.stockActual ?? 0,
        stockMinimo: data.stockMinimo ?? 0,
        stockMaximo: data.stockMaximo,
        leadTimeDias: data.leadTimeDias ?? 21,
        criticidad: data.criticidad ?? 'MEDIO',
        precioUnitario: data.precioUnitario,
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        proveedor: { select: { id: true, nombre: true } },
      },
    });
  }

  async update(id: string, data: UpdateProductDto) {
    return this.prisma.producto.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: {
        categoria: { select: { id: true, nombre: true } },
        proveedor: { select: { id: true, nombre: true } },
      },
    });
  }

  async softDelete(id: string) {
    return this.prisma.producto.update({
      where: { id },
      data: { activo: false },
    });
  }

  async updateMetrics(id: string, metrics: {
    demandaPromedio?: number;
    stockSeguridad?: number;
    puntoPedido?: number;
    diasCobertura?: number | null;
  }) {
    return this.prisma.producto.update({
      where: { id },
      data: { ...metrics, updatedAt: new Date() },
    });
  }

  async updateStock(id: string, nuevoStock: number) {
    return this.prisma.producto.update({
      where: { id },
      data: {
        stockActual: nuevoStock,
        ultimoMovimiento: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  private buildWhereClause(filters: ProductFilterDto): Prisma.ProductoWhereInput {
    const where: Prisma.ProductoWhereInput = { activo: true };

    if (filters.search) {
      where.OR = [
        { codigoProducto: { contains: filters.search, mode: 'insensitive' } },
        { descripcion: { contains: filters.search, mode: 'insensitive' } },
        { codigoSap: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.categoriaId) where.categoriaId = filters.categoriaId;
    if (filters.criticidad) where.criticidad = filters.criticidad;

    if (filters.stockBajo) {
      where.stockActual = { lte: this.prisma.producto.fields.stockMinimo };
    }

    if (filters.conAlerta) {
      where.alertas = { some: { estado: 'ACTIVA' } };
    }

    return where;
  }
}