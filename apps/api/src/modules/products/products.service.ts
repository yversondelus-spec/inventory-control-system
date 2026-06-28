import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import type { CreateProductDto, ProductFilterDto, UpdateProductDto } from './dto/products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: ProductFilterDto) {
    const { page = 1, limit = 20, sortBy = 'codigoProducto', sortOrder = 'desc' } = filters;
    const includeAlertCount = filters.includeAlertCount ?? false;
    const skip = (page - 1) * limit;
    const stockBajo = filters.stockBajo ?? false;

    const where = this.buildWhereClause(filters);

    if (!stockBajo) {
      const include: Prisma.ProductoInclude = {
        categoria: { select: { id: true, nombre: true, color: true } },
      };

      if (includeAlertCount) {
        include._count = { select: { alertas: { where: { estado: 'ACTIVA' } } } };
      }

      const [data, total] = await this.prisma.$transaction([
        this.prisma.producto.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include,
        }),
        this.prisma.producto.count({ where }),
      ]);

      return {
        data,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      };
    }

    const orderColumn = this.mapSortBy(sortBy);
    const orderDirection = sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
    const rawWhere = this.buildRawWhereClause(filters);
    const alertCountSelect = includeAlertCount
      ? Prisma.sql`, (SELECT COUNT(*) FROM alertas a WHERE a.producto_id = p.id AND a.estado = 'ACTIVA') AS alertas_count`
      : Prisma.empty;

    const [rows, totalRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<any[]>`
        SELECT
          p.*, c.id AS categoria_id, c.nombre AS categoria_nombre, c.color AS categoria_color,
          pr.id AS proveedor_id, pr.nombre AS proveedor_nombre, pr.lead_time_dias AS proveedor_lead_time_dias
          ${alertCountSelect}
        FROM productos p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
        WHERE ${rawWhere}
        ORDER BY ${Prisma.raw(orderColumn)} ${orderDirection}
        LIMIT ${limit}
        OFFSET ${skip}
      `,
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT COUNT(*) AS total
        FROM productos p
        WHERE ${rawWhere}
      `,
    ]);

    const data = rows.map((row) => ({
      id: row.id,
      codigoProducto: row.codigo_producto,
      codigoSap: row.codigo_sap,
      descripcion: row.descripcion,
      unidadMedida: row.unidad_medida,
      categoriaId: row.categoria_id,
      proveedorId: row.proveedor_id,
      stockActual: Number(row.stock_actual),
      stockMinimo: Number(row.stock_minimo),
      stockMaximo: Number(row.stock_maximo),
      stockSeguridad: Number(row.stock_seguridad),
      puntoPedido: Number(row.punto_pedido),
      leadTimeDias: row.lead_time_dias,
      criticidad: row.criticidad,
      precioUnitario: row.precio_unitario,
      demandaPromedio: row.demanda_promedio,
      diasCobertura: row.dias_cobertura,
      activo: row.activo,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      categoria: row.categoria_id
        ? { id: row.categoria_id, nombre: row.categoria_nombre, color: row.categoria_color }
        : null,
      proveedor: row.proveedor_id
        ? { id: row.proveedor_id, nombre: row.proveedor_nombre, leadTimeDias: row.proveedor_lead_time_dias }
        : null,
      ...(includeAlertCount ? { _count: { alertas: Number(row.alertas_count ?? 0) } } : {}),
    }));

    const total = Number(totalRows[0]?.total ?? 0);
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string) {
    const product = await this.prisma.producto.findUnique({
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

    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
    return product;
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
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        codigo_producto: string;
        descripcion: string;
        unidad_medida: string;
        stock_actual: number;
        stock_minimo: number;
        punto_pedido: number;
        criticidad: string;
        dias_cobertura: number | null;
        categoria_nombre: string | null;
        categoria_color: string | null;
        proveedor_nombre: string | null;
        proveedor_lead_time_dias: number | null;
      }>
    >`
      SELECT
        p.id,
        p.codigo_producto,
        p.descripcion,
        p.unidad_medida,
        p.stock_actual,
        p.stock_minimo,
        p.punto_pedido,
        p.criticidad,
        p.dias_cobertura,
        c.nombre AS categoria_nombre,
        c.color AS categoria_color,
        pr.nombre AS proveedor_nombre,
        pr.lead_time_dias AS proveedor_lead_time_dias
      FROM productos p
      LEFT JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
      WHERE p.activo = true
        AND p.punto_pedido > 0
        AND p.stock_actual <= p.punto_pedido
      ORDER BY p.dias_cobertura ASC NULLS LAST
    `;

    return rows.map((row) => ({
      id: row.id,
      codigoProducto: row.codigo_producto,
      descripcion: row.descripcion,
      unidadMedida: row.unidad_medida,
      stockActual: Number(row.stock_actual),
      stockMinimo: Number(row.stock_minimo),
      puntoPedido: Number(row.punto_pedido),
      criticidad: row.criticidad,
      diasCobertura: row.dias_cobertura,
      categoria: row.categoria_nombre
        ? { nombre: row.categoria_nombre, color: row.categoria_color }
        : null,
      proveedor: row.proveedor_nombre
        ? { nombre: row.proveedor_nombre, leadTimeDias: row.proveedor_lead_time_dias }
        : null,
    }));
  }

  async create(dto: CreateProductDto) {
    const existing = await this.findMany({
      search: dto.codigoProducto,
      limit: 1,
    });
    if (existing.data.some((p) => p.codigoProducto === dto.codigoProducto)) {
      throw new ConflictException(`Código de producto '${dto.codigoProducto}' ya existe`);
    }

    return this.prisma.producto.create({
      data: {
        codigoProducto: dto.codigoProducto,
        codigoSap: dto.codigoSap,
        descripcion: dto.descripcion,
        unidadMedida: dto.unidadMedida ?? 'UN',
        categoriaId: dto.categoriaId,
        proveedorId: dto.proveedorId,
        stockActual: dto.stockActual ?? 0,
        stockMinimo: dto.stockMinimo ?? 0,
        stockMaximo: dto.stockMaximo,
        leadTimeDias: dto.leadTimeDias ?? 21,
        criticidad: dto.criticidad ?? 'MEDIO',
        precioUnitario: dto.precioUnitario,
      },
      include: {
        categoria: { select: { id: true, nombre: true } },
        proveedor: { select: { id: true, nombre: true } },
      },
    });
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id);
    return this.prisma.producto.update({
      where: { id },
      data: { ...dto, updatedAt: new Date() },
      include: {
        categoria: { select: { id: true, nombre: true } },
        proveedor: { select: { id: true, nombre: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.softDelete(id);
  }

  async getMovements(id: string, days: number = 90) {
    await this.findById(id);
    const since = new Date();
    since.setDate(since.getDate() - days);
    return { productId: id, since, days };
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
    if (filters.conAlerta) {
      where.alertas = { some: { estado: 'ACTIVA' } };
    }

    return where;
  }

  private buildRawWhereClause(filters: ProductFilterDto) {
    const conditions: Prisma.Sql[] = [Prisma.sql`p.activo = true`];

    if (filters.search) {
      const term = `%${filters.search}%`;
      conditions.push(
        Prisma.sql`(p.codigo_producto ILIKE ${term} OR p.descripcion ILIKE ${term} OR p.codigo_sap ILIKE ${term})`,
      );
    }

    if (filters.categoriaId) {
      conditions.push(Prisma.sql`p.categoria_id = ${filters.categoriaId}`);
    }

    if (filters.criticidad) {
      conditions.push(Prisma.sql`p.criticidad = ${filters.criticidad}`);
    }

    if (filters.stockBajo) {
      conditions.push(Prisma.sql`p.stock_actual <= p.stock_minimo`);
    }

    if (filters.conAlerta) {
      conditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM alertas a
          WHERE a.producto_id = p.id
            AND a.estado = 'ACTIVA'
        )`,
      );
    }

    return Prisma.join(conditions, ' AND ');
  }

  private mapSortBy(sortBy: string) {
    const columns: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      codigoProducto: 'codigo_producto',
      stockActual: 'stock_actual',
      stockMinimo: 'stock_minimo',
      criticidad: 'criticidad',
    };

    return columns[sortBy] ?? columns.createdAt;
  }
}
