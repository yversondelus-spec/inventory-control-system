const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

bcrypt.hash('123456789', 12).then(async (hash) => {
  const r = await prisma.usuario.update({
    where: { email: 'ydelus@aerosan.com' },
    data: { passwordHash: hash }
  });
  console.log('OK:', r.email, hash);
  await prisma.$disconnect();
});