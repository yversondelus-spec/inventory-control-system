import { PrismaClient, $Enums } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Aerosan2026!', 12);

  const user = await prisma.usuario.upsert({
    where: { email: 'ydelus@aerosan.com' },
    update: { passwordHash },
    create: {
      email: 'ydelus@aerosan.com',
      passwordHash,
      nombre: 'Yverson',
      apellido: 'Delus',
      role: $Enums.UserRole.ADMINISTRADOR,
      activo: true,
    },
  });

  console.log('✅ Usuario creado:', user.email);
  console.log('   Password: Aerosan2026!');
  console.log('   Role:', user.role);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());