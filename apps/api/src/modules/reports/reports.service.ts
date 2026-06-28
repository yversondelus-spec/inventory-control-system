import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Daily inventory snapshot: current state
   */
  async getDailyInventoryReport() {
    const summary = await this.inventoryService.getSummary();
    const products = await this.prisma.producto.findMany({
      select: {
        id: true,
        codigoProducto: true,
        descripcion: true,
        stockActual: true,
        stockMinimo: true,
        criticidad: true,
        categoria: { select: { nombre: true, color: true } },
      },
      orderBy: { criticidad: 'asc' },
    });

    return {
      fecha: new Date(),
      summary,
      products,
      totales: {
        productosTotales: products.length,
        productosCriticos: products.filter(p => ['CRITICO', 'ALTO'].includes(p.criticidad)).length,
        productosActivos: products.filter(p => p.stockActual > 0).length,
        productosInactivos: products.filter(p => p.stockActual === 0).length,
      },
    };
  }

  /**
   * Movement trends over last 30 days
   */
  async getMovementReport(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const movimientos = await this.prisma.movimiento.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        producto: { select: { codigoProducto: true, descripcion: true, categoria: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate by type
    const byType = {
      ENTRADA: movimientos.filter(m => m.tipo === 'ENTRADA').length,
      SALIDA: movimientos.filter(m => m.tipo === 'SALIDA').length,
      AJUSTE: movimientos.filter(m => m.tipo === 'AJUSTE_POSITIVO' || m.tipo === 'AJUSTE_NEGATIVO').length,
      MERMA: movimientos.filter(m => m.tipo === 'MERMA').length,
    };

    // Daily trend
    const dailyTrend: Record<string, { entradas: number; salidas: number }> = {};
    movimientos.forEach((m) => {
      const day = m.createdAt.toISOString().split('T')[0];
      if (!dailyTrend[day]) dailyTrend[day] = { entradas: 0, salidas: 0 };
      if (m.tipo === 'ENTRADA') dailyTrend[day].entradas += m.cantidad;
      if (m.tipo === 'SALIDA') dailyTrend[day].salidas += m.cantidad;
    });

    return {
      periodo: `${days} días`,
      totalMovimientos: movimientos.length,
      byType,
      dailyTrend: Object.entries(dailyTrend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, data]) => ({ fecha, ...data })),
    };
  }

  /**
   * Alert summary and trends
   */
  async getAlertSummaryReport(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const alertas = await this.prisma.alerta.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        producto: { select: { codigoProducto: true, descripcion: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const resueltas = alertas.filter(a => a.estado === 'RESUELTA').length;
    const pendientes = alertas.filter(a => a.estado === 'ACTIVA').length;
    const reconocidas = alertas.filter(a => a.estado === 'RECONOCIDA').length;
    const descartadas = alertas.filter(a => a.estado === 'DESCARTADA').length;

    // By priority
    const byPriority = {
      CRITICA: alertas.filter(a => a.prioridad === 'CRITICA').length,
      ALTA: alertas.filter(a => a.prioridad === 'ALTA').length,
      MEDIA: alertas.filter(a => a.prioridad === 'MEDIA').length,
      BAJA: alertas.filter(a => a.prioridad === 'BAJA').length,
    };

    // Daily trend
    const dailyTrend: Record<string, number> = {};
    alertas.forEach((a) => {
      const day = a.createdAt.toISOString().split('T')[0];
      dailyTrend[day] = (dailyTrend[day] || 0) + 1;
    });

    return {
      periodo: `${days} días`,
      totalAlertas: alertas.length,
      estado: { resueltas, pendientes, reconocidas, descartadas },
      byPriority,
      tasaResolucion: alertas.length > 0 ? ((resueltas / alertas.length) * 100).toFixed(1) : '0.0',
      dailyTrend: Object.entries(dailyTrend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, count]) => ({ fecha, alertas: count })),
      topIssues: [...new Map(
        alertas
          .map(a => [a.productoId, { ...a, resoluciones: alertas.filter(al => al.productoId === a.productoId).length }])
          .entries(),
      ).values()].slice(0, 10),
    };
  }

  /**
   * Critical products trend analysis
   */
  async getCriticalProductsTrendReport(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const alertas = await this.prisma.alerta.findMany({
      where: {
        createdAt: { gte: startDate },
        prioridad: { in: ['CRITICA', 'ALTA'] },
      },
      include: {
        producto: { select: { id: true, codigoProducto: true, descripcion: true } },
      },
    });

    // Group by product
    const productMap = new Map<string, any>();
    alertas.forEach((a) => {
      if (!productMap.has(a.productoId)) {
        productMap.set(a.productoId, {
          ...a.producto,
          alertasCount: 0,
          lastAlerta: a.createdAt,
        });
      }
      productMap.get(a.productoId).alertasCount += 1;
    });

    const topCritical = Array.from(productMap.values())
      .sort((a, b) => b.alertasCount - a.alertasCount)
      .slice(0, 15);

    return {
      periodo: `${days} días`,
      totalProductosCriticos: productMap.size,
      topCritical,
      dailyDistribution: Object.values(
        alertas.reduce(
          (acc, a) => {
            const day = a.createdAt.toISOString().split('T')[0];
            acc[day] = (acc[day] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      ),
    };
  }

  /**
   * Inventory valuation: stock value analysis
   */
  async getInventoryValuationReport() {
    const productos = await this.prisma.producto.findMany({
      select: {
        id: true,
        codigoProducto: true,
        descripcion: true,
        stockActual: true,
        stockMinimo: true,
        precioUnitario: true,
        categoria: { select: { nombre: true } },
      },
    });

    const totalValor = productos.reduce(
      (sum, p) => sum + (p.stockActual * (p.precioUnitario || 0)),
      0,
    );

    const byCategoria = productos.reduce(
      (acc, p) => {
        const cat = p.categoria?.nombre || 'Sin categoría';
        if (!acc[cat]) acc[cat] = { cantidad: 0, valor: 0, productos: 0 };
        acc[cat].cantidad += p.stockActual;
        acc[cat].valor += p.stockActual * (p.precioUnitario || 0);
        acc[cat].productos += 1;
        return acc;
      },
      {} as Record<string, any>,
    );

    return {
      totalValor,
      totalUnidades: productos.reduce((sum, p) => sum + p.stockActual, 0),
      byCategoria: Object.entries(byCategoria).map(([nombre, data]) => ({ nombre, ...data })),
      promedioPorProducto: productos.length > 0 ? totalValor / productos.length : 0,
      top10Valor: productos
        .sort((a, b) => (b.stockActual * (b.precioUnitario || 0)) - (a.stockActual * (a.precioUnitario || 0)))
        .slice(0, 10),
    };
  }
}
