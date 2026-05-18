const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 10);
  const user = await p.usuario.update({
    where: { email: 'ydelus@aerosan.com' },
    data: { passwordHash: hash },
  });
  console.log('✅ Clave actualizada:', user.email);
  await p.$disconnect();
}

main();