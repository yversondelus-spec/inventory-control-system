const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const hash = await bcrypt.hash('Admin1234!', 10);
  const user = await prisma.usuario.upsert({
    where: { email: 'admin@inventorycontrol.com' },
    update: { passwordHash: hash },
    create: {
      email: 'admin@inventorycontrol.com',
      nombre: 'Admin',
      apellido: 'Sistema',
      passwordHash: hash,
      role: 'ADMINISTRADOR'
    }
  });
  console.log('Usuario creado:', user.email);
  await prisma.$disconnect();
}
main().catch(console.error);
