export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const vehiculo = await prisma.vehiculo.findFirst({
      where: { id: params.id, ...tallerWhere(scope) },
    });
    if (!vehiculo) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });

    const body = await req.json();
    const data: any = {};

    if (body?.patente !== undefined) data.patente = body.patente.toUpperCase().trim();
    if (body?.marca !== undefined) data.marca = body.marca || null;
    if (body?.modelo !== undefined) data.modelo = body.modelo || null;
    if (body?.tipoVehiculo !== undefined) data.tipoVehiculo = body.tipoVehiculo || null;
    if (body?.anio !== undefined) data.anio = body.anio ? parseInt(body.anio) : null;
    if (body?.motor !== undefined) data.motor = body.motor || null;
    if (body?.chasis !== undefined) data.chasis = body.chasis?.trim() || null;
    if (body?.vin !== undefined) {
      const vinLimpio = body.vin?.trim() || null;
      if (vinLimpio) {
        const existeVin = await prisma.vehiculo.findFirst({ where: { vin: vinLimpio, id: { not: params.id } } });
        if (existeVin) return NextResponse.json({ error: `El VIN ${vinLimpio} ya está registrado en el vehículo ${existeVin.patente}` }, { status: 400 });
      }
      data.vin = vinLimpio;
      data.chasis = vinLimpio;
    }
    if (body?.clienteId !== undefined && body.clienteId) data.cliente = { connect: { id: body.clienteId } };
    if (body?.kilometraje !== undefined) data.kilometraje = body.kilometraje !== '' && body.kilometraje != null ? parseInt(body.kilometraje) : null;

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
      const field = err?.meta?.target?.includes('patente') ? 'patente' : 'campo';
      return NextResponse.json({ error: `Ya existe un vehículo con ese ${field}` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al actualizar vehículo' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (scope.role !== 'ADMIN' && scope.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const vehiculo = await prisma.vehiculo.findFirst({
      where: { id: params.id, ...tallerWhere(scope) },
    });
    if (!vehiculo) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });

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
