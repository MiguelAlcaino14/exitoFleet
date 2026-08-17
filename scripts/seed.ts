import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  await prisma.user.upsert({
    where: { email: 'super@dmotor.cl' },
    update: {},
    create: {
      email: 'super@dmotor.cl',
      passwordHash,
      nombre: 'Super Admin',
      rol: Rol.SUPER_ADMIN,
      activo: true,
      tallerId: null,
    },
  });

  console.log('Seed completado: SUPER_ADMIN creado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
