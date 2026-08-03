export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const scope = await getTallerScope();
    const ordenes = await prisma.ordenTrabajo.findMany({
      where: { ...tallerWhere(scope!) },
      include: { vehiculo: { include: { cliente: true } }, checklist: true, usuarioCreador: { select: { nombre: true } } },
      orderBy: { otNumero: 'desc' },
    });
    return NextResponse.json(ordenes ?? []);
  } catch (err: any) {
    console.error('Ordenes GET error:', err);
    return NextResponse.json({ error: 'Error al cargar órdenes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const userId = (session.user as any)?.id;
    const scope = await getTallerScope();
    const tid = scope?.tallerId ?? undefined;

    // Si es vehículo nuevo, crear cliente y vehículo
    let vehiculoId = body?.vehiculoId;

    if (!vehiculoId && body?.nuevoVehiculo) {
      const nv = body.nuevoVehiculo;
      let clienteId = nv?.clienteId;

      if (!clienteId && nv?.nuevoCliente) {
        const nc = nv.nuevoCliente;
        const cliente = await prisma.cliente.create({
          data: {
            rutEmpresa: nc?.rutEmpresa || null,
            razonSocial: nc?.razonSocial ?? 'Sin nombre',
            nombreContacto: nc?.nombreContacto || null,
            email: nc?.email || null,
            telefono: nc?.telefono || null,
            direccion: nc?.direccion || null,
            tallerId: tid,
          },
        });
        clienteId = cliente.id;
      }

      const vehiculo = await prisma.vehiculo.create({
        data: {
          patente: nv?.patente?.toUpperCase()?.trim() ?? '',
          marca: nv?.marca || null,
          modelo: nv?.modelo || null,
          tipoVehiculo: nv?.tipoVehiculo || null,
          anio: nv?.anio ? parseInt(nv.anio) : null,
          motor: nv?.motor || null,
          chasis: nv?.chasis || null,
          vin: nv?.vin || null,
          clienteId,
          tallerId: tid,
        },
      });
      vehiculoId = vehiculo.id;
    }

    if (!vehiculoId) return NextResponse.json({ error: 'Vehículo requerido' }, { status: 400 });

    // Calculate next OT number manually to avoid sequence conflicts
    const lastOT = await prisma.ordenTrabajo.findFirst({ orderBy: { otNumero: 'desc' }, select: { otNumero: true } });
    const nextOtNumero = (lastOT?.otNumero ?? 0) + 1;

    const orden = await prisma.ordenTrabajo.create({
      data: {
        otNumero: nextOtNumero,
        vehiculoId,
        kilometraje: body?.kilometraje ? parseInt(body.kilometraje) : null,
        nivelCombustible: body?.nivelCombustible || null,
        motivoIngreso: body?.motivoIngreso || null,
        conductorNombre: body?.conductorNombre || null,
        conductorRut: body?.conductorRut || null,
        conductorTelefono: body?.conductorTelefono || null,
        observaciones: body?.observaciones || null,
        mecanicoId: body?.mecanicoId || null,
        usuarioCreadorId: userId,
        tallerId: tid,
        checklist: body?.checklist ? {
          create: {
            gato: body.checklist?.gato ?? false,
            llaveRuedas: body.checklist?.llaveRuedas ?? false,
            ruedaRepuesto: body.checklist?.ruedaRepuesto ?? false,
            triangulos: body.checklist?.triangulos ?? false,
            extintor: body.checklist?.extintor ?? false,
            botiquin: body.checklist?.botiquin ?? false,
            documentos: body.checklist?.documentos ?? false,
            estadoCarroceria: body.checklist?.estadoCarroceria || null,
            nivelAceite: body.checklist?.nivelAceite || null,
            nivelLiquidoFrenos: body.checklist?.nivelLiquidoFrenos || null,
            observaciones: body.checklist?.observaciones || null,
          },
        } : undefined,
      },
      include: { vehiculo: { include: { cliente: true } }, mecanico: true },
    });

    // Create initial timeline event
    await prisma.eventoTimeline.create({
      data: {
        otId: orden.id,
        titulo: 'INGRESO A TALLER',
        descripcion: `Recepción realizada. ${body?.kilometraje ? `Kilometraje: ${parseInt(body.kilometraje).toLocaleString('es-CL')} km.` : ''} ${body?.motivoIngreso ? `Motivo: ${body.motivoIngreso}` : ''}`.trim(),
        usuario: (session.user as any)?.name ?? 'Sistema',
        tipoEvento: 'ingreso',
      },
    });

    return NextResponse.json(orden, { status: 201 });
  } catch (err: any) {
    console.error('Orden POST error:', err);
    return NextResponse.json({ error: 'Error al crear orden: ' + (err?.message ?? '') }, { status: 500 });
  }
}
