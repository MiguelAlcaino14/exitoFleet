export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const data: any = {};

    if (body?.patente !== undefined) data.patente = body.patente.toUpperCase().trim();
    if (body?.marca !== undefined) data.marca = body.marca || null;
    if (body?.modelo !== undefined) data.modelo = body.modelo || null;
    if (body?.tipoVehiculo !== undefined) data.tipoVehiculo = body.tipoVehiculo || null;
    if (body?.anio !== undefined) data.anio = body.anio ? parseInt(body.anio) : null;
    if (body?.motor !== undefined) data.motor = body.motor || null;
    if (body?.chasis !== undefined) data.chasis = body.chasis || null;
    if (body?.vin !== undefined) data.vin = body.vin || null;
    if (body?.clienteId !== undefined) data.clienteId = body.clienteId;

    const updated = await prisma.vehiculo.update({
      where: { id: params.id },
      data,
      include: {
        cliente: { select: { id: true, razonSocial: true } },
        _count: { select: { ordenes: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Vehiculo PATCH error:', err);
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un vehículo con esa patente' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al actualizar vehículo' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    // Check if vehicle has OTs
    const otCount = await prisma.ordenTrabajo.count({ where: { vehiculoId: params.id } });
    if (otCount > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar este vehículo porque tiene ${otCount} orden(es) de trabajo asociada(s).` },
        { status: 400 }
      );
    }

    await prisma.vehiculo.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Vehiculo DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar vehículo' }, { status: 500 });
  }
}
