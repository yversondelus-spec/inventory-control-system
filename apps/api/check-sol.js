const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const n = await p.solicitudReposicion.count();
  console.log('Solicitudes en DB:', n);
  await p.$disconnect();
}

main();