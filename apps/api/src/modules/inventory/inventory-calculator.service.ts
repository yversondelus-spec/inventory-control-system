import { Injectable, Logger } from '@nestjs/common';

export interface MetricasInventario {
  demandaPromedio: number;        // unidades/día
  stockSeguridad: number;         // unidades
  puntoPedido: number;            // unidades
  diasCobertura: number | null;   // días
}

export interface RiesgoDesabastecimiento {
  nivel: 'QUIEBRE' | 'CRITICO' | 'ALTO' | 'MEDIO' | 'NORMAL';
  score: number;  // 0-1
  mensaje: string;
}

interface ProductoParaCalculo {
  stockActual: number;
  stockMinimo: number;
  stockSeguridad: number;
  puntoPedido: number;
  leadTimeDias: number;
  diasCobertura?: number | null;
  criticidad: string;
}

@Injectable()
export class InventoryCalculatorService {
  private readonly logger = new Logger(InventoryCalculatorService.name);

  /**
   * Demanda Promedio = Consumo Total / Número de Días
   */
  calcularDemandaPromedio(consumoTotal: number, numeroDias: number): number {
    if (numeroDias <= 0 || consumoTotal < 0) return 0;
    return this.round(consumoTotal / numeroDias, 4);
  }

  /**
   * Stock Seguridad = Demanda Promedio Diaria × Tiempo Reposición
   */
  calcularStockSeguridad(demandaPromedioDiaria: number, tiempoReposicion: number): number {
    if (demandaPromedioDiaria <= 0 || tiempoReposicion <= 0) return 0;
    return this.round(demandaPromedioDiaria * tiempoReposicion, 2);
  }

  /**
   * Punto Pedido = (Demanda Promedio × Lead Time) + Stock Seguridad
   */
  calcularPuntoPedido(
    demandaPromedio: number,
    leadTimeDias: number,
    stockSeguridad: number,
  ): number {
    if (demandaPromedio <= 0) return 0;
    return this.round(demandaPromedio * leadTimeDias + stockSeguridad, 2);
  }

  /**
   * Días Cobertura = Stock Actual / Demanda Promedio Diaria
   */
  calcularDiasCobertura(stockActual: number, demandaPromedioDiaria: number): number | null {
    if (demandaPromedioDiaria <= 0) return null;
    if (stockActual <= 0) return 0;
    return this.round(stockActual / demandaPromedioDiaria, 1);
  }

  /**
   * Calcula todas las métricas de un producto en una sola llamada
   */
  calcularMetricas(
    consumoTotal: number,
    numeroDias: number,
    leadTimeDias: number,
    stockActual: number,
  ): MetricasInventario {
    const demandaPromedio = this.calcularDemandaPromedio(consumoTotal, numeroDias);
    const stockSeguridad = this.calcularStockSeguridad(demandaPromedio, leadTimeDias);
    const puntoPedido = this.calcularPuntoPedido(demandaPromedio, leadTimeDias, stockSeguridad);
    const diasCobertura = this.calcularDiasCobertura(stockActual, demandaPromedio);

    return { demandaPromedio, stockSeguridad, puntoPedido, diasCobertura };
  }

  /**
   * Capital Inmovilizado = Σ (Stock Actual × Precio Unitario)
   */
  calcularCapitalInmovilizado(
    productos: Array<{ stockActual: number; precioUnitario: number | null }>,
  ): number {
    return this.round(
      productos.reduce((acc, p) => acc + p.stockActual * (p.precioUnitario ?? 0), 0),
      2,
    );
  }

  /**
   * Fill Rate = (Pedidos Satisfechos / Total Pedidos) × 100
   */
  calcularFillRate(pedidosSatisfechos: number, totalPedidos: number): number {
    if (totalPedidos <= 0) return 100;
    return this.round((pedidosSatisfechos / totalPedidos) * 100, 2);
  }

  /**
   * Precisión Inventario = (1 - |Diferencia| / Stock SAP) × 100
   */
  calcularPrecisionInventario(stockFisico: number, stockSap: number): number {
    if (stockSap <= 0) return 100;
    const diferencia = Math.abs(stockFisico - stockSap);
    return this.round((1 - diferencia / stockSap) * 100, 2);
  }

  /**
   * Evaluación de riesgo de desabastecimiento por producto
   */
  evaluarRiesgo(producto: ProductoParaCalculo): RiesgoDesabastecimiento {
    const { stockActual, puntoPedido, stockSeguridad, leadTimeDias, diasCobertura, criticidad } =
      producto;

    if (stockActual <= 0) {
      return {
        nivel: 'QUIEBRE',
        score: 1.0,
        mensaje: 'Sin stock disponible — quiebre activo',
      };
    }

    if (stockActual <= stockSeguridad) {
      return {
        nivel: 'CRITICO',
        score: 0.9,
        mensaje: `Stock bajo nivel de seguridad (${stockActual} ≤ ${stockSeguridad})`,
      };
    }

    if (stockActual <= puntoPedido) {
      return {
        nivel: 'ALTO',
        score: 0.7,
        mensaje: `Punto de pedido alcanzado — ordenar reposición`,
      };
    }

    if (diasCobertura !== null && diasCobertura !== undefined && diasCobertura < leadTimeDias) {
      return {
        nivel: 'ALTO',
        score: 0.65,
        mensaje: `Cobertura (${diasCobertura}d) menor al lead time (${leadTimeDias}d)`,
      };
    }

    if (diasCobertura !== null && diasCobertura !== undefined && diasCobertura < leadTimeDias * 1.5) {
      return {
        nivel: 'MEDIO',
        score: 0.4,
        mensaje: `Cobertura ajustada — monitorear consumo`,
      };
    }

    if (criticidad === 'CRITICO' && (diasCobertura ?? 999) < 30) {
      return {
        nivel: 'MEDIO',
        score: 0.3,
        mensaje: `Producto crítico con cobertura < 30 días`,
      };
    }

    return {
      nivel: 'NORMAL',
      score: 0.05,
      mensaje: 'Stock en niveles aceptables',
    };
  }

  /**
   * Calcula estadísticas de consumo desde un array de cantidades diarias
   */
  calcularEstadisticasConsumo(consumosDiarios: number[]): {
    total: number;
    promedio: number;
    maximo: number;
    minimo: number;
    desviacionEstandar: number;
  } {
    if (consumosDiarios.length === 0) {
      return { total: 0, promedio: 0, maximo: 0, minimo: 0, desviacionEstandar: 0 };
    }

    const total = consumosDiarios.reduce((a, b) => a + b, 0);
    const promedio = total / consumosDiarios.length;
    const maximo = Math.max(...consumosDiarios);
    const minimo = Math.min(...consumosDiarios);
    const varianza =
      consumosDiarios.reduce((acc, val) => acc + Math.pow(val - promedio, 2), 0) /
      consumosDiarios.length;
    const desviacionEstandar = Math.sqrt(varianza);

    return {
      total: this.round(total, 2),
      promedio: this.round(promedio, 4),
      maximo: this.round(maximo, 2),
      minimo: this.round(minimo, 2),
      desviacionEstandar: this.round(desviacionEstandar, 4),
    };
  }

  private round(value: number, decimals: number): number {
    return parseFloat(value.toFixed(decimals));
  }
}
