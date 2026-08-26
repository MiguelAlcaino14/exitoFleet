import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Limpiando datos anteriores...');
  await prisma.fotografia.deleteMany();
  await prisma.itemValorizacion.deleteMany();
  await prisma.eventoTimeline.deleteMany();
  await prisma.checklistRecepcion.deleteMany();
  await prisma.factura.deleteMany();
  await prisma.ordenTrabajo.deleteMany();
  await prisma.eventoCliente.deleteMany();
  await prisma.contactoCliente.deleteMany();
  await prisma.vehiculo.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.mecanico.deleteMany();
  await prisma.cuentaCorreo.deleteMany();
  await prisma.user.deleteMany();
  await prisma.taller.deleteMany();

  console.log('Creando taller...');
  const taller = await prisma.taller.create({
    data: {
      nombre: 'Taller D Motor',
      slug: 'dmotor',
      razonSocial: 'D Motor SpA',
      rut: '76.543.210-9',
      direccion: 'Av. Providencia 1234, Providencia',
      telefono: '+56 2 2345 6789',
      celular: '+56 9 8765 4321',
      email: 'contacto@dmotor.cl',
      division: 'Taller Mecánico',
      colorPrimario: '#F4B63D',
      colorFondo: '#ffffff',
      activo: true,
    },
  });

  console.log('Creando usuarios...');
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  await prisma.user.create({
    data: {
      email: 'superadmin@dmotor.cl',
      passwordHash: hash('super123'),
      nombre: 'Super Admin',
      rol: 'SUPER_ADMIN',
      tallerId: null,
      activo: true,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@dmotor.cl',
      passwordHash: hash('admin123'),
      nombre: 'Carlos Muñoz',
      rol: 'ADMIN',
      tallerId: taller.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'jefe@dmotor.cl',
      passwordHash: hash('jefe123'),
      nombre: 'Pedro Rojas',
      rol: 'JEFE_TALLER',
      tallerId: taller.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'recepcion@dmotor.cl',
      passwordHash: hash('recep123'),
      nombre: 'Ana Martínez',
      rol: 'RECEPCION',
      tallerId: taller.id,
    },
  });

  await prisma.user.create({
    data: {
      email: 'finanzas@dmotor.cl',
      passwordHash: hash('fin123'),
      nombre: 'Valeria Torres',
      rol: 'FINANZAS',
      tallerId: taller.id,
    },
  });

  console.log('Creando mecánicos...');
  const mecanico1 = await prisma.mecanico.create({
    data: { nombre: 'Juan Pérez', tallerId: taller.id },
  });
  const mecanico2 = await prisma.mecanico.create({
    data: { nombre: 'Luis Contreras', tallerId: taller.id },
  });
  const mecanico3 = await prisma.mecanico.create({
    data: { nombre: 'Roberto Silva', tallerId: taller.id },
  });

  console.log('Creando clientes...');
  const cliente1 = await prisma.cliente.create({
    data: {
      rutEmpresa: '76.111.222-3',
      razonSocial: 'Transportes Andina Ltda.',
      giro: 'Transporte de Carga',
      nombreContacto: 'Mario Vargas',
      email: 'mario.vargas@andina.cl',
      telefono: '+56 9 7654 3210',
      direccion: 'Ruta 5 Norte Km 45, Quilicura',
      tallerId: taller.id,
    },
  });

  const cliente2 = await prisma.cliente.create({
    data: {
      rutEmpresa: '77.333.444-5',
      razonSocial: 'Constructora Pacífico S.A.',
      giro: 'Construcción',
      nombreContacto: 'Daniela Fuentes',
      email: 'dfuentes@pacifico.cl',
      telefono: '+56 9 8123 4567',
      direccion: 'Av. Las Condes 5678, Las Condes',
      tallerId: taller.id,
    },
  });

  const cliente3 = await prisma.cliente.create({
    data: {
      rutEmpresa: '78.555.666-7',
      razonSocial: 'Minera Los Andes SpA',
      giro: 'Minería',
      nombreContacto: 'Sergio Morales',
      email: 'smorales@losandes.cl',
      telefono: '+56 9 9234 5678',
      direccion: 'Av. Apoquindo 3000, Las Condes',
      tallerId: taller.id,
    },
  });

  const cliente4 = await prisma.cliente.create({
    data: {
      rutEmpresa: '79.777.888-9',
      razonSocial: 'Agrícola San Marcos Ltda.',
      giro: 'Agricultura',
      nombreContacto: 'Patricia Soto',
      email: 'psoto@sanmarcos.cl',
      telefono: '+56 9 6345 6789',
      direccion: 'Camino Lo Barnechea 890, Lo Barnechea',
      tallerId: taller.id,
    },
  });

  console.log('Creando vehículos...');
  const v1 = await prisma.vehiculo.create({
    data: {
      patente: 'GCBK-21',
      marca: 'Volvo',
      modelo: 'FH 500',
      tipoVehiculo: 'Camión',
      anio: 2019,
      motor: 'D13K500',
      clienteId: cliente1.id,
      tallerId: taller.id,
    },
  });
  const v2 = await prisma.vehiculo.create({
    data: {
      patente: 'HJRT-45',
      marca: 'Mercedes-Benz',
      modelo: 'Actros 2651',
      tipoVehiculo: 'Camión',
      anio: 2021,
      motor: 'OM 471',
      clienteId: cliente1.id,
      tallerId: taller.id,
    },
  });
  const v3 = await prisma.vehiculo.create({
    data: {
      patente: 'BKPL-88',
      marca: 'Caterpillar',
      modelo: '336 GC',
      tipoVehiculo: 'Maquinaria',
      anio: 2020,
      motor: 'C9.3B',
      clienteId: cliente2.id,
      tallerId: taller.id,
    },
  });
  const v4 = await prisma.vehiculo.create({
    data: {
      patente: 'FMQZ-67',
      marca: 'Komatsu',
      modelo: 'PC200-8M0',
      tipoVehiculo: 'Excavadora',
      anio: 2022,
      motor: 'SAA6D107E-2',
      clienteId: cliente2.id,
      tallerId: taller.id,
    },
  });
  const v5 = await prisma.vehiculo.create({
    data: {
      patente: 'WNDS-12',
      marca: 'Scania',
      modelo: 'R 560',
      tipoVehiculo: 'Camión',
      anio: 2018,
      motor: 'DC16',
      clienteId: cliente3.id,
      tallerId: taller.id,
    },
  });
  const v6 = await prisma.vehiculo.create({
    data: {
      patente: 'TPLK-33',
      marca: 'John Deere',
      modelo: '8R 310',
      tipoVehiculo: 'Tractor',
      anio: 2021,
      motor: 'PowerTech PSS 9.0L',
      clienteId: cliente4.id,
      tallerId: taller.id,
    },
  });
  const v7 = await prisma.vehiculo.create({
    data: {
      patente: 'QRBN-56',
      marca: 'Ford',
      modelo: 'F-150 Raptor',
      tipoVehiculo: 'Camioneta',
      anio: 2023,
      motor: '3.5L EcoBoost',
      clienteId: cliente3.id,
      tallerId: taller.id,
    },
  });

  console.log('Creando órdenes de trabajo...');

  const hace = (dias: number) => {
    const d = new Date();
    d.setDate(d.getDate() - dias);
    return d;
  };

  // OT1 - EN_TRABAJO
  const ot1 = await prisma.ordenTrabajo.create({
    data: {
      otNumero: 1,
      vehiculoId: v1.id,
      fechaIngreso: hace(8),
      kilometraje: 145230,
      nivelCombustible: '3/4',
      motivoIngreso: 'Cambio de aceite motor y revisión sistema de frenos. Cliente reporta ruido al frenar.',
      estado: 'EN_TRABAJO',
      conductorNombre: 'Marco Espinoza',
      conductorRut: '12.345.678-9',
      conductorTelefono: '+56 9 8765 1234',
      fechaDiagnostico: hace(7),
      diagnosticoMecanico: 'Frenos desgastados al 15%, pastillas traseras requieren cambio inmediato. Aceite motor con 8.000 km de uso, se recomienda cambio. Filtro de aire sucio.',
      fechaValorizacion: hace(6),
      valorRepuestos: 285000,
      valorManoObra: 95000,
      valorTotal: 380000,
      fechaAprobacion: hace(5),
      fechaInicioTrabajo: hace(4),
      mecanicoId: mecanico1.id,
      usuarioCreadorId: admin.id,
      tallerId: taller.id,
    },
  });

  await prisma.checklistRecepcion.create({
    data: {
      otId: ot1.id,
      gato: true,
      llaveRuedas: true,
      ruedaRepuesto: true,
      triangulos: true,
      extintor: true,
      botiquin: false,
      documentos: true,
      estadoCarroceria: 'Buen estado. Rayón pequeño en puerta trasera derecha.',
      nivelAceite: 'Bajo',
      nivelLiquidoFrenos: 'Normal',
      observaciones: 'Vehículo ingresa con luces traseras izquierdas funcionando solo al 50%.',
    },
  });

  await prisma.itemValorizacion.createMany({
    data: [
      { otId: ot1.id, tipo: 'REPUESTO', descripcion: 'Pastillas de freno traseras (x4)', cantidad: 1, costoUnitario: 85000, margen: 30, precioVenta: 110500, orden: 1 },
      { otId: ot1.id, tipo: 'REPUESTO', descripcion: 'Aceite motor 15W-40 (5L)', cantidad: 1, costoUnitario: 42000, margen: 30, precioVenta: 54600, orden: 2 },
      { otId: ot1.id, tipo: 'REPUESTO', descripcion: 'Filtro de aceite', cantidad: 1, costoUnitario: 12000, margen: 30, precioVenta: 15600, orden: 3 },
      { otId: ot1.id, tipo: 'REPUESTO', descripcion: 'Filtro de aire', cantidad: 1, costoUnitario: 38000, margen: 30, precioVenta: 49400, orden: 4 },
      { otId: ot1.id, tipo: 'MANO_DE_OBRA', descripcion: 'M.O. Cambio pastillas y aceite', cantidad: 2.5, costoUnitario: 38000, margen: 0, precioVenta: 95000, orden: 5 },
    ],
  });

  // OT2 - ESPERANDO_APROBACION (con alerta - lleva 4 días)
  const ot2 = await prisma.ordenTrabajo.create({
    data: {
      otNumero: 2,
      vehiculoId: v2.id,
      fechaIngreso: hace(6),
      kilometraje: 89500,
      nivelCombustible: '1/2',
      motivoIngreso: 'Falla en sistema hidráulico. Pérdida de presión al elevar carga.',
      estado: 'ESPERANDO_APROBACION',
      conductorNombre: 'Felipe Castillo',
      conductorRut: '15.432.876-K',
      conductorTelefono: '+56 9 7654 9876',
      fechaDiagnostico: hace(5),
      diagnosticoMecanico: 'Bomba hidráulica con desgaste avanzado. Sellos del cilindro principal con fuga. Se requiere reemplazo completo de la unidad hidráulica.',
      fechaValorizacion: hace(4),
      valorRepuestos: 1250000,
      valorManoObra: 180000,
      valorTotal: 1430000,
      mecanicoId: mecanico2.id,
      usuarioCreadorId: admin.id,
      tallerId: taller.id,
    },
  });

  await prisma.checklistRecepcion.create({
    data: {
      otId: ot2.id,
      gato: true,
      llaveRuedas: true,
      ruedaRepuesto: false,
      triangulos: true,
      extintor: true,
      botiquin: true,
      documentos: true,
      estadoCarroceria: 'Buen estado general.',
      nivelAceite: 'Normal',
      nivelLiquidoFrenos: 'Bajo',
    },
  });

  // OT3 - POR_DIAGNOSTICAR
  const ot3 = await prisma.ordenTrabajo.create({
    data: {
      otNumero: 3,
      vehiculoId: v3.id,
      fechaIngreso: hace(1),
      kilometraje: 3420,
      nivelCombustible: 'Lleno',
      motivoIngreso: 'Ruido anormal en brazo hidráulico izquierdo durante operación. Mantenimiento preventivo programado.',
      estado: 'POR_DIAGNOSTICAR',
      conductorNombre: 'Gonzalo Herrera',
      conductorRut: '14.876.543-2',
      conductorTelefono: '+56 9 5678 9012',
      usuarioCreadorId: admin.id,
      tallerId: taller.id,
    },
  });

  await prisma.checklistRecepcion.create({
    data: {
      otId: ot3.id,
      gato: false,
      llaveRuedas: false,
      ruedaRepuesto: false,
      triangulos: false,
      extintor: true,
      botiquin: false,
      documentos: true,
      estadoCarroceria: 'Sin daños visibles en carrocería.',
      nivelAceite: 'Normal',
      nivelLiquidoFrenos: 'Normal',
      observaciones: 'Máquina llega desde faena Pudahuel. Operador indica falla esporádica.',
    },
  });

  // OT4 - POR_FACTURAR
  const ot4 = await prisma.ordenTrabajo.create({
    data: {
      otNumero: 4,
      vehiculoId: v4.id,
      fechaIngreso: hace(15),
      kilometraje: 1850,
      nivelCombustible: '3/4',
      motivoIngreso: 'Mantenimiento preventivo 2000 horas. Cambio completo de fluidos y revisión estructural.',
      estado: 'POR_FACTURAR',
      conductorNombre: 'Alejandro Navarro',
      conductorRut: '16.234.567-8',
      conductorTelefono: '+56 9 4321 0987',
      fechaDiagnostico: hace(14),
      diagnosticoMecanico: 'Mantenimiento según pauta fabricante. Todo en orden. Se reemplazaron todos los filtros y fluidos según protocolo 2000 horas.',
      fechaValorizacion: hace(13),
      valorRepuestos: 680000,
      valorManoObra: 240000,
      valorTotal: 920000,
      fechaAprobacion: hace(12),
      fechaInicioTrabajo: hace(11),
      fechaTermino: hace(3),
      mecanicoId: mecanico3.id,
      usuarioCreadorId: admin.id,
      tallerId: taller.id,
    },
  });

  await prisma.itemValorizacion.createMany({
    data: [
      { otId: ot4.id, tipo: 'REPUESTO', descripcion: 'Aceite hidráulico ISO 46 (20L)', cantidad: 2, costoUnitario: 85000, margen: 25, precioVenta: 212500, orden: 1 },
      { otId: ot4.id, tipo: 'REPUESTO', descripcion: 'Filtros hidráulicos (set)', cantidad: 1, costoUnitario: 95000, margen: 25, precioVenta: 118750, orden: 2 },
      { otId: ot4.id, tipo: 'REPUESTO', descripcion: 'Aceite de motor (10L)', cantidad: 1, costoUnitario: 78000, margen: 25, precioVenta: 97500, orden: 3 },
      { otId: ot4.id, tipo: 'REPUESTO', descripcion: 'Kit de filtros motor', cantidad: 1, costoUnitario: 145000, margen: 25, precioVenta: 181250, orden: 4 },
      { otId: ot4.id, tipo: 'MANO_DE_OBRA', descripcion: 'M.O. Mantención 2000 horas', cantidad: 8, costoUnitario: 30000, margen: 0, precioVenta: 240000, orden: 5 },
    ],
  });

  // OT5 - EN_COTIZACION
  const ot5 = await prisma.ordenTrabajo.create({
    data: {
      otNumero: 5,
      vehiculoId: v5.id,
      fechaIngreso: hace(4),
      kilometraje: 312000,
      nivelCombustible: '1/4',
      motivoIngreso: 'Falla en caja de cambios. Dificultad para entrar en 3ra y 4ta marcha. Vibración excesiva a 80 km/h.',
      estado: 'EN_COTIZACION',
      conductorNombre: 'Cristóbal Vega',
      conductorRut: '13.765.432-1',
      conductorTelefono: '+56 9 3456 7890',
      fechaDiagnostico: hace(3),
      diagnosticoMecanico: 'Desgaste en sincronizadores de 3ra y 4ta marcha. Rodamiento de entrada dañado. Posible reparación o reemplazo de caja según disponibilidad de repuestos.',
      mecanicoId: mecanico1.id,
      usuarioCreadorId: admin.id,
      tallerId: taller.id,
    },
  });

  // OT6 - CERRADA (con factura)
  const ot6 = await prisma.ordenTrabajo.create({
    data: {
      otNumero: 6,
      vehiculoId: v6.id,
      fechaIngreso: hace(30),
      kilometraje: 890,
      nivelCombustible: 'Lleno',
      motivoIngreso: 'Revisión técnica anual y cambio de neumáticos.',
      estado: 'CERRADA',
      conductorNombre: 'Rodrigo Campos',
      conductorRut: '11.234.567-0',
      conductorTelefono: '+56 9 2345 6789',
      fechaDiagnostico: hace(29),
      diagnosticoMecanico: 'Todo en orden. Solo se requiere cambio de neumáticos por desgaste normal.',
      fechaValorizacion: hace(28),
      valorRepuestos: 520000,
      valorManoObra: 65000,
      valorTotal: 585000,
      fechaAprobacion: hace(27),
      fechaInicioTrabajo: hace(26),
      fechaTermino: hace(22),
      fechaFacturacion: hace(21),
      mecanicoId: mecanico2.id,
      usuarioCreadorId: admin.id,
      tallerId: taller.id,
    },
  });

  await prisma.factura.create({
    data: {
      numero: 'F-000123',
      otId: ot6.id,
      montoNeto: 491597,
      iva: 93403,
      montoTotal: 585000,
      observaciones: 'Factura por servicio de revisión y cambio de neumáticos.',
      tallerId: taller.id,
    },
  });

  // OT7 - POR_DIAGNOSTICAR (recién ingresada)
  const ot7 = await prisma.ordenTrabajo.create({
    data: {
      otNumero: 7,
      vehiculoId: v7.id,
      fechaIngreso: new Date(),
      kilometraje: 28750,
      nivelCombustible: '1/2',
      motivoIngreso: 'Luz de check engine encendida. Posible falla en sensor de oxígeno.',
      estado: 'POR_DIAGNOSTICAR',
      conductorNombre: 'Ignacio Moreno',
      conductorRut: '17.890.123-4',
      conductorTelefono: '+56 9 1234 5678',
      usuarioCreadorId: admin.id,
      tallerId: taller.id,
    },
  });

  // Eventos de timeline para OT1
  await prisma.eventoTimeline.createMany({
    data: [
      { otId: ot1.id, titulo: 'OT creada', descripcion: 'Orden de trabajo ingresada al sistema', usuario: 'Carlos Muñoz', tipoEvento: 'sistema' },
      { otId: ot1.id, titulo: 'Diagnóstico completado', descripcion: 'Juan Pérez completó el diagnóstico del vehículo', usuario: 'Juan Pérez', tipoEvento: 'diagnostico' },
      { otId: ot1.id, titulo: 'Cotización enviada al cliente', descripcion: 'Se envió cotización por $380.000 al contacto Mario Vargas', usuario: 'Ana Martínez', tipoEvento: 'cotizacion' },
      { otId: ot1.id, titulo: 'Aprobación recibida', descripcion: 'Cliente aprobó la cotización vía telefónica', usuario: 'Ana Martínez', tipoEvento: 'aprobacion' },
      { otId: ot1.id, titulo: 'Trabajo iniciado', descripcion: 'Juan Pérez inició los trabajos en el vehículo', usuario: 'Juan Pérez', tipoEvento: 'trabajo' },
    ],
  });

  console.log('\n✅ Seed completado exitosamente!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Credenciales de acceso:');
  console.log('  Admin:    admin@dmotor.cl      / admin123');
  console.log('  Jefe:     jefe@dmotor.cl       / jefe123');
  console.log('  Recep:    recepcion@dmotor.cl  / recep123');
  console.log('  Finanzas: finanzas@dmotor.cl   / fin123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
