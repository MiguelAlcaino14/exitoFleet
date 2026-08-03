export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const orden = await prisma.ordenTrabajo.findFirst({
      where: { id: params?.id, ...tallerWhere(scope) },
      include: {
        vehiculo: { include: { cliente: true } },
        mecanico: true,
        checklist: true,
        fotografias: true,
        usuarioCreador: { select: { nombre: true } },
      },
    });
    if (!orden) return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 });
    return NextResponse.json(orden);
  } catch (err: any) {
    console.error('Orden GET error:', err);
    return NextResponse.json({ error: 'Error al cargar OT' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const orden = await prisma.ordenTrabajo.findFirst({
      where: { id: params?.id, ...tallerWhere(scope) },
    });
    if (!orden) return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 });

    const body = await req.json();
    const data: any = {};
    const now = new Date();

    if (body?.estado !== undefined) {
      data.estado = body.estado;
      if (body.estado === 'EN_COTIZACION') data.fechaDiagnostico = now;
      if (body.estado === 'ESPERANDO_APROBACION') data.fechaValorizacion = now;
      if (body.estado === 'EN_TRABAJO') {
        data.fechaAprobacion = now;
        data.fechaInicioTrabajo = now;
      }
      if (body.estado === 'POR_FACTURAR') data.fechaTermino = now;
      if (body.estado === 'CERRADA') data.fechaFacturacion = now;
    }

    if (body?.diagnosticoMecanico !== undefined) data.diagnosticoMecanico = body.diagnosticoMecanico;
    if (body?.valorRepuestos !== undefined) data.valorRepuestos = parseFloat(body.valorRepuestos) || 0;
    if (body?.valorManoObra !== undefined) data.valorManoObra = parseFloat(body.valorManoObra) || 0;
    if (body?.valorTotal !== undefined) data.valorTotal = parseFloat(body.valorTotal) || 0;
    if (body?.observaciones !== undefined) data.observaciones = body.observaciones;
    if (body?.mecanicoId !== undefined) data.mecanicoId = body.mecanicoId || null;

    const updated = await prisma.ordenTrabajo.update({
      where: { id: params?.id },
      data,
      include: { vehiculo: { include: { cliente: true } }, mecanico: true },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Orden PATCH error:', err);
    return NextResponse.json({ error: 'Error al actualizar OT' }, { status: 500 });
  }
}
