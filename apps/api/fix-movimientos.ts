import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const duplicados = await prisma.movimiento.findMany({
    where: {
      fecha: { gte: new Date('2026-05-16T00:00:00.000Z') },
      origen: 'SAP_UPLOAD',
    },
    select: { id: true, fecha: true },
  });

  console.log(`Movimientos a eliminar: ${duplicados.length}`);

  const result = await prisma.movimiento.deleteMany({
    where: {
      fecha: { gte: new Date('2026-05-16T00:00:00.000Z') },
      origen: 'SAP_UPLOAD',
    },
  });

  console.log(`✅ Eliminados: ${result.count} movimientos`);
}

main().catch(console.error).finally(() => prisma.$disconnect());