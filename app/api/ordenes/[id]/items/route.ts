export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const items = await prisma.itemValorizacion.findMany({
      where: { otId: params?.id },
      orderBy: [{ tipo: 'asc' }, { orden: 'asc' }, { createdAt: 'asc' }],
    });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error('Items GET error:', err);
    return NextResponse.json({ error: 'Error al cargar items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const item = await prisma.itemValorizacion.create({
      data: {
        otId: params?.id,
        tipo: body?.tipo ?? 'REPUESTO',
        descripcion: body?.descripcion ?? '',
        cantidad: parseFloat(body?.cantidad) || 1,
        costoUnitario: parseFloat(body?.costoUnitario) || 0,
        margen: parseFloat(body?.margen) || 0,
        precioVenta: parseFloat(body?.precioVenta) || 0,
        orden: parseInt(body?.orden) || 0,
      },
    });

    // Recalculate totals on OrdenTrabajo
    const allItems = await prisma.itemValorizacion.findMany({ where: { otId: params?.id } });
    const valorRepuestos = allItems
      .filter(i => ['REPUESTO', 'INSUMO'].includes(i.tipo))
      .reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0);
    const valorManoObra = allItems
      .filter(i => i.tipo === 'MANO_DE_OBRA')
      .reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0);
    const valorServicios = allItems
      .filter(i => i.tipo === 'SERVICIO')
      .reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0);
    const valorDescuentos = allItems
      .filter(i => i.tipo === 'DESCUENTO')
      .reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0);
    const valorTotal = valorRepuestos + valorManoObra + valorServicios - valorDescuentos;

    await prisma.ordenTrabajo.update({
      where: { id: params?.id },
      data: { valorRepuestos, valorManoObra, valorTotal },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error('Items POST error:', err);
    return NextResponse.json({ error: 'Error al crear item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');
    if (!itemId) return NextResponse.json({ error: 'itemId requerido' }, { status: 400 });

    await prisma.itemValorizacion.delete({ where: { id: itemId } });

    // Recalculate totals
    const allItems = await prisma.itemValorizacion.findMany({ where: { otId: params?.id } });
    const valorRepuestos = allItems
      .filter(i => ['REPUESTO', 'INSUMO'].includes(i.tipo))
      .reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0);
    const valorManoObra = allItems
      .filter(i => i.tipo === 'MANO_DE_OBRA')
      .reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0);
    const valorServicios = allItems
      .filter(i => i.tipo === 'SERVICIO')
      .reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0);
    const valorDescuentos = allItems
      .filter(i => i.tipo === 'DESCUENTO')
      .reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0);
    const valorTotal = valorRepuestos + valorManoObra + valorServicios - valorDescuentos;

    await prisma.ordenTrabajo.update({
      where: { id: params?.id },
      data: { valorRepuestos, valorManoObra, valorTotal },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Items DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar item' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const itemId = body?.itemId;
    if (!itemId) return NextResponse.json({ error: 'itemId requerido' }, { status: 400 });

    const data: any = {};
    if (body?.descripcion !== undefined) data.descripcion = body.descripcion;
    if (body?.cantidad !== undefined) data.cantidad = parseFloat(body.cantidad) || 1;
    if (body?.costoUnitario !== undefined) data.costoUnitario = parseFloat(body.costoUnitario) || 0;
    if (body?.margen !== undefined) data.margen = parseFloat(body.margen) || 0;
    if (body?.precioVenta !== undefined) data.precioVenta = parseFloat(body.precioVenta) || 0;

    await prisma.itemValorizacion.update({ where: { id: itemId }, data });

    // Recalculate totals
    const allItems = await prisma.itemValorizacion.findMany({ where: { otId: params?.id } });
    const valorRepuestos = allItems
      .filter(i => ['REPUESTO', 'INSUMO'].includes(i.tipo))
      .reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0);
    const valorManoObra = allItems
      .filter(i => i.tipo === 'MANO_DE_OBRA')
      .reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0);
    const valorServicios = allItems
      .filter(i => i.tipo === 'SERVICIO')
      .reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0);
    const valorDescuentos = allItems
      .filter(i => i.tipo === 'DESCUENTO')
      .reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0);
    const valorTotal = valorRepuestos + valorManoObra + valorServicios - valorDescuentos;

    await prisma.ordenTrabajo.update({
      where: { id: params?.id },
      data: { valorRepuestos, valorManoObra, valorTotal },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Items PATCH error:', err);
    return NextResponse.json({ error: 'Error al actualizar item' }, { status: 500 });
  }
}
