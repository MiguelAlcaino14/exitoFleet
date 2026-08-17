import { PrismaClient, Rol } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 1. Crear taller por defecto
  const taller = await prisma.taller.upsert({
    where: { slug: 'principal' },
    update: {},
    create: {
      nombre: 'Taller Principal',
      slug: 'principal',
      razonSocial: '',
      rut: '',
      direccion: '',
      telefono: '',
      email: '',
    },
  });
  console.log('✅ Taller principal:', taller.id);

  // 2. Copiar datos de ConfiguracionTaller al Taller
  const config = await prisma.configuracionTaller.findUnique({ where: { id: 'singleton' } });
  if (config) {
    await prisma.taller.update({
      where: { id: taller.id },
      data: {
        razonSocial: config.razonSocial || '',
        rut: config.rut || '',
        direccion: config.direccion || '',
        telefono: config.telefono || '',
        celular: config.celular || '',
        email: config.email || '',
        division: config.division || '',
        logoUrl: config.logoUrl || '',
      },
    });
    console.log('✅ Config copiada al taller');
  }

  // 3. Backfill todos los registros sin tallerId
  const updateMany = async (model: string, table: any) => {
    const result = await table.updateMany({
      where: { tallerId: null },
      data: { tallerId: taller.id },
    });
    console.log(`✅ ${model}: ${result.count} registros asignados al taller principal`);
  };

  await updateMany('User', prisma.user);
  await updateMany('Cliente', prisma.cliente);
  await updateMany('Vehiculo', prisma.vehiculo);
  await updateMany('OrdenTrabajo', prisma.ordenTrabajo);
  await updateMany('Mecanico', prisma.mecanico);
  await updateMany('Factura', prisma.factura);
  await updateMany('CuentaCorreo', prisma.cuentaCorreo);

  // 4. Crear Super Admin
  const superHash = await bcrypt.hash('super2025', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'super@dmotor.cl' },
    update: { rol: Rol.SUPER_ADMIN, tallerId: null },
    create: {
      email: 'super@dmotor.cl',
      passwordHash: superHash,
      nombre: 'Super Administrador',
      rol: Rol.SUPER_ADMIN,
      tallerId: null, // sin taller — ve todos
    },
  });
  console.log('✅ Super Admin creado:', superAdmin.email, '/ contraseña: super2025');

  console.log('\n🎉 Backfill completado exitosamente');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
