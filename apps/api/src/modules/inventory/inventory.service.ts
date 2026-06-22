import { Injectable, Logger } from '@nestjs/common';
import { subDays } from 'date-fns';

import { PrismaService } from '../../prisma/prisma.service';
import { InventoryCalculatorService } from './inventory-calculator.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: InventoryCalculatorService,
  ) {}

  /**
   * Resumen ejecutivo del Dashboard.
   *
   * ANTES: traía TODOS los productos activos completos a memoria y hacía
   * 5-6 pasadas con .filter()/.reduce() en Node. Con miles de productos
   * esto es la causa principal de la lentitud al cargar el Dashboard.
   *
   * AHORA: todo se calcula con agregaciones SQL ($queryRaw / aggregate),
   * la base de datos hace el trabajo pesado y solo viaja por red el
   * resultado final (un puñado de números).
   */
  async getSummary() {
    const [
      totalProductos,
      productosActivos,
      alertasActivas,
      alertasCriticas,
      productosCriticos,
      nivelesStock,
      coberturaYCapital,
    ] = await Promise.all([
      this.prisma.producto.count(),
      this.prisma.producto.count({ where: { activo: true } }),
      this.prisma.alerta.count({ where: { estado: 'ACTIVA' } }),
      this.prisma.alerta.count({ where: { estado: 'ACTIVA', prioridad: 'CRITICA' } }),
      this.prisma.producto.count({
        where: { activo: true, criticidad: { in: ['CRITICO', 'ALTO'] } },
      }),
      this.getNivelesStock(),
      this.getCoberturaYCapital(),
    ]);

    return {
      totalProductos,
      productosActivos,
      productosCriticos,
      quiebreStock: nivelesStock.quiebreStock,
      stockCritico: nivelesStock.stockCritico,
      stockBajo: nivelesStock.stockBajo,
      stockNormal: nivelesStock.stockNormal,
      alertasActivas,
      alertasCriticas,
      capitalInmovilizado: coberturaYCapital.capitalInmovilizado,
      coberturaPromedio: Math.round(coberturaYCapital.coberturaPromedio * 10) / 10,
      ultimaActualizacion: new Date().toISOString(),
    };
  }

  /**
   * 4 niveles de stock calculados en SQL con CASE WHEN.
   * Reemplaza los 4 .filter() secuenciales sobre el array completo.
   */
  private async getNivelesStock() {
    const rows = await this.prisma.$queryRaw<
      { quiebre_stock: bigint; stock_critico: bigint; stock_bajo: bigint; stock_normal: bigint }[]
    >`
      SELECT
        COUNT(*) FILTER (WHERE stock_actual <= 0) AS quiebre_stock,
        COUNT(*) FILTER (
          WHERE stock_actual > 0 AND stock_minimo > 0 AND stock_actual < stock_minimo * 0.2
        ) AS stock_critico,
        COUNT(*) FILTER (
          WHERE stock_minimo > 0 AND stock_actual >= stock_minimo * 0.2 AND stock_actual < stock_minimo
        ) AS stock_bajo,
        COUNT(*) FILTER (
          WHERE stock_minimo = 0 OR stock_actual >= stock_minimo
        ) AS stock_normal
      FROM productos
      WHERE activo = true
    `;

    const r = rows[0];
    return {
      quiebreStock: Number(r?.quiebre_stock ?? 0),
      stockCritico: Number(r?.stock_critico ?? 0),
      stockBajo: Number(r?.stock_bajo ?? 0),
      stockNormal: Number(r?.stock_normal ?? 0),
    };
  }

  /**
   * Cobertura promedio (solo ALTO/CRITICO) y capital inmovilizado (todos),
   * calculados con AVG/SUM en SQL en vez de reduce() en memoria.
   */
  private async getCoberturaYCapital() {
    const [coberturaRows, capitalRows] = await Promise.all([
      this.prisma.$queryRaw<{ cobertura_promedio: number | null }[]>`
        SELECT AVG((stock_actual / stock_minimo) * 30) AS cobertura_promedio
        FROM productos
        WHERE activo = true
          AND criticidad IN ('ALTO', 'CRITICO')
          AND stock_minimo > 0
      `,
      this.prisma.$queryRaw<{ capital_inmovilizado: number | null }[]>`
        SELECT SUM(stock_actual * COALESCE(precio_unitario, 0)) AS capital_inmovilizado
        FROM productos
        WHERE activo = true
      `,
    ]);

    return {
      coberturaPromedio: Number(coberturaRows[0]?.cobertura_promedio ?? 0),
      capitalInmovilizado: Number(capitalRows[0]?.capital_inmovilizado ?? 0),
    };
  }

  /**
   * Productos críticos para las tarjetas destacadas del Dashboard.
   * Trae solo los campos necesarios, solo criticidad CRITICO/ALTO,
   * ordenados por cobertura más baja primero (los que necesitan
   * atención inmediata arriba).
   *
   * Esto reemplaza el patrón del frontend de pedir 50 productos
   * completos (con categoría, proveedor, conteo de alertas) solo
   * para quedarse con 7-8 en el navegador.
   */
  async getCriticalProducts(limit = 12) {
    const productos = await this.prisma.producto.findMany({
      where: {
        activo: true,
        criticidad: { in: ['CRITICO', 'ALTO'] },
      },
      select: {
        id: true,
        codigoProducto: true,
        descripcion: true,
        unidadMedida: true,
        stockActual: true,
        stockMinimo: true,
        demandaPromedio: true,
        criticidad: true,
        categoria: { select: { nombre: true, color: true } },
      },
      orderBy: [{ criticidad: 'asc' }, { stockActual: 'asc' }],
      take: limit,
    });

    return productos.map((p) => {
      const diasCobertura = p.demandaPromedio && p.demandaPromedio > 0
        ? Math.round((p.stockActual / p.demandaPromedio) * 10) / 10
        : p.stockMinimo > 0
          ? Math.round((p.stockActual / p.stockMinimo) * 30 * 10) / 10
          : null;

      let estado: 'QUIEBRE' | 'CRITICO' | 'BAJO' | 'NORMAL' = 'NORMAL';
      if (p.stockActual <= 0) estado = 'QUIEBRE';
      else if (p.stockMinimo > 0 && p.stockActual < p.stockMinimo * 0.2) estado = 'CRITICO';
      else if (p.stockMinimo > 0 && p.stockActual < p.stockMinimo) estado = 'BAJO';

      return { ...p, diasCobertura, estado };
    });
  }

  async getDifferences(limit = 50) {
    return this.prisma.sapDiferencia.findMany({
      where: { resuelto: false },
      include: {
        producto: {
          select: { codigoProducto: true, descripcion: true, stockActual: true },
        },
      },
      orderBy: { porcentajeDiff: 'desc' },
      take: limit,
    });
  }

  async recalculateAllMetrics() {
    this.logger.log('Iniciando recálculo de métricas de inventario...');

    const products = await this.prisma.producto.findMany({
      where: { activo: true },
      select: { id: true, stockActual: true, stockMinimo: true, leadTimeDias: true },
    });

    let updated = 0;

    for (const product of products) {
      try {
        const since = subDays(new Date(), 90);
        const consumo = await this.prisma.movimiento.aggregate({
          where: {
            productoId: product.id,
            tipo: { in: ['SALIDA', 'MERMA'] },
            fecha: { gte: since },
          },
          _sum: { cantidad: true },
          _count: { id: true },
        });

        const consumoTotal = consumo._sum.cantidad ?? 0;
        const diasConDatos = consumo._count.id > 0 ? 90 : 1;

        let metricas;
        if (consumoTotal > 0) {
          metricas = this.calculator.calcularMetricas(
            consumoTotal,
            diasConDatos,
            product.leadTimeDias,
            product.stockActual,
          );
        } else {
          const diasCobertura =
            product.stockMinimo > 0
              ? Math.round((product.stockActual / product.stockMinimo) * 30 * 10) / 10
              : null;

          metricas = {
            demandaPromedio: 0,
            stockSeguridad: 0,
            puntoPedido: 0,
            diasCobertura,
          };
        }

        await this.prisma.producto.update({
          where: { id: product.id },
          data: {
            demandaPromedio: metricas.demandaPromedio,
            stockSeguridad: metricas.stockSeguridad,
            puntoPedido: metricas.puntoPedido,
            diasCobertura: metricas.diasCobertura,
          },
        });

        updated++;
      } catch (error) {
        this.logger.error(
          `Error calculando métricas para producto ${product.id}`,
          error,
        );
      }
    }

    this.logger.log(`Métricas actualizadas para ${updated}/${products.length} productos`);
    return { updated, total: products.length };
  }

  async processBatch(
    records: Array<{
      codigoSap: string;
      stockSap: number;
      fecha: Date;
    }>,
    uploadId: string,
  ) {
    for (const record of records) {
      const product = await this.prisma.producto.findUnique({
        where: { codigoSap: record.codigoSap },
      });

      if (!product) continue;

      const stockAnterior = product.stockActual;
      const stockNuevo = record.stockSap;
      const diferencia = stockNuevo - stockAnterior;
      const porcentajeDiff =
        stockAnterior > 0 ? Math.abs(diferencia / stockAnterior) * 100 : 0;

      await this.prisma.producto.update({
        where: { id: product.id },
        data: { stockActual: stockNuevo },
      });

      if (diferencia !== 0) {
        const tipo = diferencia > 0 ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO';
        await this.prisma.movimiento.create({
          data: {
            productoId: product.id,
            tipo,
            cantidad: Math.abs(diferencia),
            cantidadAntes: stockAnterior,
            cantidadDespues: stockNuevo,
            fecha: record.fecha,
            origen: 'SAP_UPLOAD',
            uploadId,
            referencia: `SAP-${record.codigoSap}`,
            observacion: 'Ajuste automático desde Upload SAP',
          },
        });
      }

      if (Math.abs(porcentajeDiff) > 1) {
        await this.prisma.sapDiferencia.create({
          data: {
            productoId: product.id,
            stockSistema: stockAnterior,
            stockSap: stockNuevo,
            diferencia,
            porcentajeDiff,
            uploadId,
          },
        });
      }
    }
  }
}