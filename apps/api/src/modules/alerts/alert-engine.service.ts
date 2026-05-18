import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Producto } from '@prisma/client';
import { PrioridadAlerta, TipoAlerta } from '@repo/shared-types';

import { PrismaService } from '../../prisma/prisma.service';

interface AlertRule {
  tipo: TipoAlerta;
  prioridad: PrioridadAlerta;
  check: (p: Producto) => boolean;
  mensaje: (p: Producto) => string;
  valorActual?: (p: Producto) => number;
  valorUmbral?: (p: Producto) => number;
}

@Injectable()
export class AlertEngineService {
  private readonly logger = new Logger(AlertEngineService.name);

  private readonly RULES: AlertRule[] = [
    {
      tipo: TipoAlerta.QUIEBRE_STOCK,
      prioridad: PrioridadAlerta.CRITICA,
      check: (p) => p.stockActual <= 0,
      mensaje: (p) => `QUIEBRE DE STOCK: ${p.descripcion} (${p.codigoProducto}) — sin unidades disponibles`,
      valorActual: (p) => p.stockActual,
      valorUmbral: () => 0,
    },
    {
      tipo: TipoAlerta.STOCK_BAJO,
      prioridad: PrioridadAlerta.ALTA,
      check: (p) => p.stockActual > 0 && p.stockActual <= p.stockMinimo,
      mensaje: (p) => `Stock bajo mínimo: ${p.descripcion} — actual ${p.stockActual} ≤ mínimo ${p.stockMinimo}`,
      valorActual: (p) => p.stockActual,
      valorUmbral: (p) => p.stockMinimo,
    },
    {
      tipo: TipoAlerta.REPOSICION_URGENTE,
      prioridad: PrioridadAlerta.ALTA,
      check: (p) => p.stockActual > p.stockMinimo && p.puntoPedido > 0 && p.stockActual <= p.puntoPedido,
      mensaje: (p) => `Punto de pedido alcanzado: ${p.descripcion} — ordenar reposición`,
      valorActual: (p) => p.stockActual,
      valorUmbral: (p) => p.puntoPedido,
    },
    {
      tipo: TipoAlerta.PRODUCTO_CRITICO,
      prioridad: PrioridadAlerta.MEDIA,
      check: (p) => p.criticidad === 'CRITICO' && p.diasCobertura !== null && (p.diasCobertura ?? 999) < 30,
      mensaje: (p) => `Producto crítico con baja cobertura: ${p.descripcion} — ${p.diasCobertura} días`,
      valorActual: (p) => p.diasCobertura ?? 0,
      valorUmbral: () => 30,
    },
    {
      tipo: TipoAlerta.LEAD_TIME_VENCIDO,
      prioridad: PrioridadAlerta.ALTA,
      check: (p) => p.diasCobertura !== null && (p.diasCobertura ?? 999) < p.leadTimeDias,
      mensaje: (p) => `Cobertura menor al lead time: ${p.descripcion} — ${p.diasCobertura}d vs ${p.leadTimeDias}d`,
      valorActual: (p) => p.diasCobertura ?? 0,
      valorUmbral: (p) => p.leadTimeDias,
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async runFullCheck(): Promise<{ created: number; resolved: number }> {
    this.logger.log('Ejecutando evaluación completa de alertas...');

    const products = await this.prisma.producto.findMany({ where: { activo: true } });

    const activeAlerts = await this.prisma.alerta.findMany({
      where: { estado: 'ACTIVA' },
      select: { id: true, productoId: true, tipo: true },
    });

    const activeMap = new Map<string, string>();
    for (const a of activeAlerts) {
      activeMap.set(`${a.productoId}:${a.tipo}`, a.id);
    }

    const toCreate: Prisma.AlertaCreateManyInput[] = [];
    const toResolve: string[] = [];

    for (const product of products) {
      for (const rule of this.RULES) {
        const key = `${product.id}:${rule.tipo}`;
        const shouldFire = rule.check(product);
        const existingId = activeMap.get(key);

        if (shouldFire && !existingId) {
          toCreate.push({
            productoId: product.id,
            tipo: rule.tipo,
            prioridad: rule.prioridad,
            mensaje: rule.mensaje(product),
            valorActual: rule.valorActual?.(product),
            valorUmbral: rule.valorUmbral?.(product),
          });
        } else if (!shouldFire && existingId) {
          toResolve.push(existingId);
        }
      }
    }

    await this.prisma.$transaction([
      this.prisma.alerta.createMany({ data: toCreate }),
      this.prisma.alerta.updateMany({
        where: { id: { in: toResolve } },
        data: { estado: 'RESUELTA', resolvedAt: new Date() },
      }),
    ]);

    this.logger.log(`Alertas: ${toCreate.length} creadas, ${toResolve.length} resueltas`);
    return { created: toCreate.length, resolved: toResolve.length };
  }
}