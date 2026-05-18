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

  async getSummary() {
    const [
      totalProductos,
      productosActivos,
      alertasActivas,
      alertasCriticas,
      productosCriticos,
    ] = await this.prisma.$transaction([
      this.prisma.producto.count(),
      this.prisma.producto.count({ where: { activo: true } }),
      this.prisma.alerta.count({ where: { estado: 'ACTIVA' } }),
      this.prisma.alerta.count({ where: { estado: 'ACTIVA', prioridad: 'CRITICA' } }),
      this.prisma.producto.count({
        where: { activo: true, criticidad: { in: ['CRITICO', 'ALTO'] } },
      }),
    ]);

    const productos = await this.prisma.producto.findMany({
      where: { activo: true },
      select: { stockActual: true, stockMinimo: true, precioUnitario: true, criticidad: true },
    });

    // 4 niveles de stock
    const quiebreStock = productos.filter(p => p.stockActual <= 0).length;
    const stockCritico = productos.filter(p =>
      p.stockActual > 0 && p.stockMinimo > 0 && p.stockActual < p.stockMinimo * 0.2
    ).length;
    const stockBajo = productos.filter(p =>
      p.stockMinimo > 0 && p.stockActual >= p.stockMinimo * 0.2 && p.stockActual < p.stockMinimo
    ).length;
    const stockNormal = productos.filter(p =>
      p.stockMinimo === 0 || p.stockActual >= p.stockMinimo
    ).length;

    // Cobertura solo productos CRITICO/ALTO
    const productosCriticosData = productos.filter(p =>
      ['ALTO', 'CRITICO'].includes(p.criticidad) && p.stockMinimo > 0
    );
    const coberturaPromedio = productosCriticosData.length > 0
      ? productosCriticosData.reduce((acc, p) =>
          acc + (p.stockActual / p.stockMinimo) * 30, 0
        ) / productosCriticosData.length
      : 0;

    // Capital inmovilizado
    const capitalInmovilizado = productos.reduce((acc, p) =>
      acc + p.stockActual * (p.precioUnitario ?? 0), 0
    );

    return {
      totalProductos,
      productosActivos,
      productosCriticos,
      quiebreStock,
      stockCritico,
      stockBajo,
      stockNormal,
      alertasActivas,
      alertasCriticas,
      capitalInmovilizado,
      coberturaPromedio: Math.round(coberturaPromedio * 10) / 10,
      ultimaActualizacion: new Date().toISOString(),
    };
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