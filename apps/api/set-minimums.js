const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const CATEGORIA_CONFIG = {
  'EPP':                 { stockMinimo: 50, leadTime: 30 },
  'Uniformes':           { stockMinimo: 20, leadTime: 30 },
  'Materiales Embalaje': { stockMinimo: 100, leadTime: 21 },
  'Insumos Oficina':     { stockMinimo: 10, leadTime: 21 },
};

const CRITICIDAD_CONFIG = {
  'CRITICO': { stockMinimo: 80, puntoPedido: 120 },
  'ALTO':    { stockMinimo: 50, puntoPedido: 75 },
};

async function main() {
  const productos = await prisma.producto.findMany({
    include: { categoria: true },
  });

  console.log(`Actualizando ${productos.length} productos...`);
  let actualizados = 0;

  for (const p of productos) {
    const catConfig = CATEGORIA_CONFIG[p.categoria?.nombre] ?? { stockMinimo: 10, leadTime: 21 };
    const critConfig = CRITICIDAD_CONFIG[p.criticidad];

    const stockMinimo = critConfig?.stockMinimo ?? catConfig.stockMinimo;
    const puntoPedido = critConfig?.puntoPedido ?? Math.round(stockMinimo * 1.5);
    const leadTimeDias = catConfig.leadTime;
    const stockSeguridad = Math.round(stockMinimo * 0.5);

    await prisma.producto.update({
      where: { id: p.id },
      data: { stockMinimo, puntoPedido, leadTimeDias, stockSeguridad },
    });
    actualizados++;
  }

  console.log(`✅ ${actualizados} productos actualizados con mínimos correctos`);
  await prisma.$disconnect();
}

main().catch(console.error);