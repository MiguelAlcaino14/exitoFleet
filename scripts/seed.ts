import { PrismaClient, Rol, EstadoOT, TipoFoto } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('johndoe123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);
  const jefeHash = await bcrypt.hash('jefe123', 10);

  // Users
  const testUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: { email: 'john@doe.com', passwordHash, nombre: 'Test Admin', rol: Rol.ADMIN },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@exito.cl' },
    update: {},
    create: { email: 'admin@exito.cl', passwordHash: adminHash, nombre: 'Administrador', rol: Rol.ADMIN },
  });

  const jefeUser = await prisma.user.upsert({
    where: { email: 'jefe@exito.cl' },
    update: {},
    create: { email: 'jefe@exito.cl', passwordHash: jefeHash, nombre: 'Carlos Muñoz', rol: Rol.JEFE_TALLER },
  });

  // Clientes
  const cliente1 = await prisma.cliente.upsert({
    where: { rutEmpresa: '76.123.456-7' },
    update: {},
    create: { rutEmpresa: '76.123.456-7', razonSocial: 'Transportes Pérez Ltda.', nombreContacto: 'Juan Pérez', email: 'jperez@transportes.cl', telefono: '+56912345678', direccion: 'Av. Industrial 1234, Santiago' },
  });

  const cliente2 = await prisma.cliente.upsert({
    where: { rutEmpresa: '76.987.654-3' },
    update: {},
    create: { rutEmpresa: '76.987.654-3', razonSocial: 'Logística del Sur S.A.', nombreContacto: 'María González', email: 'mgonzalez@logsur.cl', telefono: '+56987654321', direccion: 'Ruta 5 Sur Km 234, Rancagua' },
  });

  const cliente3 = await prisma.cliente.upsert({
    where: { rutEmpresa: '76.555.888-1' },
    update: {},
    create: { rutEmpresa: '76.555.888-1', razonSocial: 'Minera Norte SpA', nombreContacto: 'Roberto Soto', email: 'rsoto@mineranorte.cl', telefono: '+56955588811', direccion: 'Av. Minería 500, Antofagasta' },
  });

  // Vehículos
  const v1 = await prisma.vehiculo.upsert({
    where: { patente: 'ABCD-12' },
    update: {},
    create: { patente: 'ABCD-12', marca: 'Volvo', modelo: 'FH 540', tipoVehiculo: 'Tracto Camión', anio: 2019, motor: 'D13K540', vin: 'YV2RT40A4YB123456', clienteId: cliente1.id },
  });

  const v2 = await prisma.vehiculo.upsert({
    where: { patente: 'WXYZ-34' },
    update: {},
    create: { patente: 'WXYZ-34', marca: 'Scania', modelo: 'R500', tipoVehiculo: 'Tracto Camión', anio: 2021, motor: 'DC13', vin: 'XLB4X20005E654321', clienteId: cliente2.id },
  });

  const v3 = await prisma.vehiculo.upsert({
    where: { patente: 'FL-4566' },
    update: {},
    create: { patente: 'FL-4566', marca: 'Mercedes-Benz', modelo: 'Actros 2645', tipoVehiculo: 'Camión Tolva', anio: 2020, motor: 'OM471', vin: 'WDB9634031L987654', clienteId: cliente3.id },
  });

  const v4 = await prisma.vehiculo.upsert({
    where: { patente: 'TRK-901' },
    update: {},
    create: { patente: 'TRK-901', marca: 'Kenworth', modelo: 'T800', tipoVehiculo: 'Tracto Camión', anio: 2018, motor: 'Cummins X15', vin: '1XKDD49X2JJ654321', clienteId: cliente1.id },
  });

  const v5 = await prisma.vehiculo.upsert({
    where: { patente: 'GHJ-221' },
    update: {},
    create: { patente: 'GHJ-221', marca: 'Volvo', modelo: 'FH 460', tipoVehiculo: 'Tracto Camión', anio: 2022, motor: 'D13K460', vin: 'YV2RT40A8NB789012', clienteId: cliente2.id },
  });

  // OTs demo
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  await prisma.ordenTrabajo.upsert({
    where: { otNumero: 1 },
    update: {},
    create: { otNumero: 1, vehiculoId: v1.id, kilometraje: 540200, nivelCombustible: '1/2', motivoIngreso: 'Ruido en caja de cambios', estado: EstadoOT.POR_DIAGNOSTICAR, conductorNombre: 'Pedro Arriagada', fechaIngreso: daysAgo(1), usuarioCreadorId: adminUser.id },
  });

  await prisma.ordenTrabajo.upsert({
    where: { otNumero: 2 },
    update: {},
    create: { otNumero: 2, vehiculoId: v2.id, kilometraje: 120800, nivelCombustible: '3/4', motivoIngreso: 'Mantención preventiva 120.000 km', estado: EstadoOT.EN_COTIZACION, conductorNombre: 'Luis Contreras', fechaIngreso: daysAgo(2), fechaDiagnostico: daysAgo(1), diagnosticoMecanico: 'Cambio filtros, aceite motor y caja. Revisión frenos.', valorRepuestos: 850000, valorManoObra: 350000, valorTotal: 1200000, usuarioCreadorId: adminUser.id },
  });

  await prisma.ordenTrabajo.upsert({
    where: { otNumero: 3 },
    update: {},
    create: { otNumero: 3, vehiculoId: v3.id, kilometraje: 890000, nivelCombustible: '1/4', motivoIngreso: 'Falla sistema de frenos ABS', estado: EstadoOT.ESPERANDO_APROBACION, conductorNombre: 'Mario Tapia', fechaIngreso: daysAgo(5), fechaDiagnostico: daysAgo(4), diagnosticoMecanico: 'Sensor ABS rueda trasera izquierda dañado. Módulo ABS con códigos de falla.', valorRepuestos: 2500000, valorManoObra: 800000, valorTotal: 3300000, fechaValorizacion: daysAgo(4), usuarioCreadorId: jefeUser.id },
  });

  await prisma.ordenTrabajo.upsert({
    where: { otNumero: 4 },
    update: {},
    create: { otNumero: 4, vehiculoId: v4.id, kilometraje: 310500, nivelCombustible: '1/2', motivoIngreso: 'Cambio de embrague completo', estado: EstadoOT.EN_TRABAJO, conductorNombre: 'Andrés Mora', fechaIngreso: daysAgo(3), fechaDiagnostico: daysAgo(2), diagnosticoMecanico: 'Disco de embrague desgastado. Se requiere reemplazo kit completo.', valorRepuestos: 1800000, valorManoObra: 1200000, valorTotal: 3000000, fechaAprobacion: daysAgo(1), fechaInicioTrabajo: daysAgo(1), usuarioCreadorId: adminUser.id },
  });

  await prisma.ordenTrabajo.upsert({
    where: { otNumero: 5 },
    update: {},
    create: { otNumero: 5, vehiculoId: v5.id, kilometraje: 670100, nivelCombustible: 'E', motivoIngreso: 'Motor con pérdida de potencia', estado: EstadoOT.ESPERANDO_APROBACION, conductorNombre: 'Felipe Rivas', fechaIngreso: daysAgo(6), fechaDiagnostico: daysAgo(5), diagnosticoMecanico: 'Turbo con juego axial excesivo. Inyectores con caudal irregular.', valorRepuestos: 5500000, valorManoObra: 2000000, valorTotal: 7500000, fechaValorizacion: daysAgo(5), usuarioCreadorId: jefeUser.id },
  });

  await prisma.ordenTrabajo.upsert({
    where: { otNumero: 6 },
    update: {},
    create: { otNumero: 6, vehiculoId: v1.id, kilometraje: 538000, nivelCombustible: 'F', motivoIngreso: 'Revisión eléctrica general', estado: EstadoOT.POR_FACTURAR, conductorNombre: 'Pedro Arriagada', fechaIngreso: daysAgo(8), fechaDiagnostico: daysAgo(7), diagnosticoMecanico: 'Alternador con baja carga. Cableado en mal estado.', valorRepuestos: 450000, valorManoObra: 300000, valorTotal: 750000, fechaAprobacion: daysAgo(6), fechaInicioTrabajo: daysAgo(5), fechaTermino: daysAgo(1), usuarioCreadorId: adminUser.id },
  });

  await prisma.ordenTrabajo.upsert({
    where: { otNumero: 7 },
    update: {},
    create: { otNumero: 7, vehiculoId: v2.id, kilometraje: 119000, nivelCombustible: '3/4', motivoIngreso: 'Cambio diferencial trasero', estado: EstadoOT.CERRADA, conductorNombre: 'Luis Contreras', fechaIngreso: daysAgo(15), fechaDiagnostico: daysAgo(14), diagnosticoMecanico: 'Diferencial con ruido metálico. Corona y piñón desgastados.', valorRepuestos: 3200000, valorManoObra: 1500000, valorTotal: 4700000, fechaAprobacion: daysAgo(13), fechaInicioTrabajo: daysAgo(12), fechaTermino: daysAgo(3), fechaFacturacion: daysAgo(2), usuarioCreadorId: adminUser.id },
  });

  console.log('✅ Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
