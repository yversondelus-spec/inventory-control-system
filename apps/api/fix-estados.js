const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const r1 = await p.solicitudReposicion.updateMany({
    where: { estado: 'ENVIADA' },
    data: { estado: 'PENDIENTE' }
  });
  const r2 = await p.solicitudReposicion.updateMany({
    where: { estado: 'EN_PROCESO' },
    data: { estado: 'PENDIENTE' }
  });
  const r3 = await p.solicitudReposicion.updateMany({
    where: { estado: 'CANCELADA' },
    data: { estado: 'COMPLETADA' }
  });
  console.log('OK:', r1, r2, r3);
  await p.$disconnect();
}

main().catch(console.error);