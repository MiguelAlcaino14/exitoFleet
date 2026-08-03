export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

async function recalcularTotales(otId: string) {
  const allItems = await prisma.itemValorizacion.findMany({ where: { otId } });
  const valorRepuestos = allItems
    .filter(i => ['REPUESTO', 'INSUMO'].includes(i.tipo))
    .reduce((acc, i) => acc + i.precioVenta * i.cantidad, 0);
  const valorManoObra = allItems
    .filter(i => i.tipo === 'MANO_DE_OBRA')
    .reduce((acc, i) => acc + i.precioVenta * i.cantidad, 0);
  const valorServicios = allItems
    .filter(i => i.tipo === 'SERVICIO')
    .reduce((acc, i) => acc + i.precioVenta * i.cantidad, 0);
  const valorDescuentos = allItems
    .filter(i => i.tipo === 'DESCUENTO')
    .reduce((acc, i) => acc + i.precioVenta * i.cantidad, 0);
  const valorTotal = valorRepuestos + valorManoObra + valorServicios - valorDescuentos;
  await prisma.ordenTrabajo.update({
    where: { id: otId },
    data: { valorRepuestos, valorManoObra, valorTotal },
  });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const orden = await prisma.ordenTrabajo.findFirst({ where: { id: params.id, ...tallerWhere(scope) } });
    if (!orden) return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 });

    const items = await prisma.itemValorizacion.findMany({
      where: { otId: params.id },
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error('Items GET error:', err);
    return NextResponse.json({ error: 'Error al cargar items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const orden = await prisma.ordenTrabajo.findFirst({ where: { id: params.id, ...tallerWhere(scope) } });
    if (!orden) return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 });

    const body = await req.json();
    const item = await prisma.itemValorizacion.create({
      data: {
        otId: params.id,
        tipo: body?.tipo ?? 'REPUESTO',
        descripcion: body?.descripcion ?? '',
        cantidad: parseFloat(body?.cantidad) || 1,
        costoUnitario: parseFloat(body?.costoUnitario) || 0,
        margen: parseFloat(body?.margen) || 0,
        precioVenta: parseFloat(body?.precioVenta) || 0,
        orden: parseInt(body?.orden) || 0,
      },
    });

    await recalcularTotales(params.id);
    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error('Items POST error:', err);
    return NextResponse.json({ error: 'Error al crear item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    if (!itemId) return NextResponse.json({ error: 'itemId requerido' }, { status: 400 });

    // A6: verificar que el item pertenece a esta OT y que la OT pertenece al taller
    const item = await prisma.itemValorizacion.findFirst({
      where: { id: itemId, otId: params.id },
    });
    if (!item) return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });

    const orden = await prisma.ordenTrabajo.findFirst({ where: { id: params.id, ...tallerWhere(scope) } });
    if (!orden) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

    await prisma.itemValorizacion.delete({ where: { id: itemId } });
    await recalcularTotales(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Items DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar item' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const itemId = body?.itemId;
    if (!itemId) return NextResponse.json({ error: 'itemId requerido' }, { status: 400 });

    // A6: verificar que el item pertenece a esta OT y que la OT pertenece al taller
    const item = await prisma.itemValorizacion.findFirst({
      where: { id: itemId, otId: params.id },
    });
    if (!item) return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });

    const orden = await prisma.ordenTrabajo.findFirst({ where: { id: params.id, ...tallerWhere(scope) } });
    if (!orden) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

    const data: any = {};
    if (body?.descripcion !== undefined) data.descripcion = body.descripcion;
    if (body?.cantidad !== undefined) data.cantidad = parseFloat(body.cantidad) || 1;
    if (body?.costoUnitario !== undefined) data.costoUnitario = parseFloat(body.costoUnitario) || 0;
    if (body?.margen !== undefined) data.margen = parseFloat(body.margen) || 0;
    if (body?.precioVenta !== undefined) data.precioVenta = parseFloat(body.precioVenta) || 0;

    await prisma.itemValorizacion.update({ where: { id: itemId }, data });
    await recalcularTotales(params.id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Items PATCH error:', err);
    return NextResponse.json({ error: 'Error al actualizar item' }, { status: 500 });
  }
}
