const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RULES = [
  {
    tipo: 'QUIEBRE_STOCK',
    prioridad: 'CRITICA',
    check: (p) => p.stockActual <= 0,
    mensaje: (p) => `QUIEBRE DE STOCK: ${p.descripcion} (${p.codigoProducto}) — sin unidades`,
    valorActual: (p) => p.stockActual,
    valorUmbral: () => 0,
  },
  {
    tipo: 'STOCK_BAJO',
    prioridad: 'ALTA',
    check: (p) => p.stockActual > 0 && p.stockActual <= p.stockMinimo,
    mensaje: (p) => `Stock bajo mínimo: ${p.descripcion} — actual ${p.stockActual} ≤ mínimo ${p.stockMinimo}`,
    valorActual: (p) => p.stockActual,
    valorUmbral: (p) => p.stockMinimo,
  },
  {
    tipo: 'REPOSICION_URGENTE',
    prioridad: 'ALTA',
    check: (p) => p.stockActual > p.stockMinimo && p.puntoPedido > 0 && p.stockActual <= p.puntoPedido,
    mensaje: (p) => `Punto de pedido alcanzado: ${p.descripcion} — stock ${p.stockActual} ≤ PP ${p.puntoPedido}`,
    valorActual: (p) => p.stockActual,
    valorUmbral: (p) => p.puntoPedido,
  },
];

async function main() {
  const products = await prisma.producto.findMany({ where: { activo: true } });
  console.log(`Evaluando ${products.length} productos...`);

  const activeAlerts = await prisma.alerta.findMany({
    where: { estado: 'ACTIVA' },
    select: { id: true, productoId: true, tipo: true },
  });

  const activeMap = new Map();
  for (const a of activeAlerts) {
    activeMap.set(`${a.productoId}:${a.tipo}`, a.id);
  }

  const toCreate = [];
  const toResolve = [];

  for (const product of products) {
    for (const rule of RULES) {
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

  if (toCreate.length > 0) {
    await prisma.alerta.createMany({ data: toCreate });
  }
  if (toResolve.length > 0) {
    await prisma.alerta.updateMany({
      where: { id: { in: toResolve } },
      data: { estado: 'RESUELTA', resolvedAt: new Date() },
    });
  }

  console.log(`✅ ${toCreate.length} alertas creadas, ${toResolve.length} resueltas`);

  // Resumen por tipo
  const resumen = {};
  for (const a of toCreate) {
    resumen[a.tipo] = (resumen[a.tipo] || 0) + 1;
  }
  console.log('Resumen:', resumen);

  await prisma.$disconnect();
}

main().catch(console.error);