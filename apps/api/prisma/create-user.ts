import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('123456', 12);
  
  const user = await prisma.usuario.upsert({
    where: { email: 'ydelus@aerosan.com' },
    update: { passwordHash: hash },
    create: {
      email: 'ydelus@aerosan.com',
      nombre: 'Yverson',
      apellido: 'Delus',
      passwordHash: hash,
      role: 'ADMINISTRADOR',
    },
  });
  
  console.log('✅ Usuario listo:', user.email);
  await prisma.$disconnect();
}

main();