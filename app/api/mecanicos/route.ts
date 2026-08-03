export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

// GET: list all mecanicos (optionally filter by activo)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const soloActivos = searchParams.get('activos') === '1';

  const scope = await getTallerScope();
  const mecanicos = await prisma.mecanico.findMany({
    where: { ...tallerWhere(scope!), ...(soloActivos ? { activo: true } : {}) },
    orderBy: { nombre: 'asc' },
  });
  return NextResponse.json(mecanicos);
}

// POST: create mecanico
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const role = (session.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'JEFE_TALLER') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const body = await req.json();
  if (!body?.nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

  const scope = await getTallerScope();
  const mecanico = await prisma.mecanico.create({
    data: { nombre: body.nombre.trim(), tallerId: scope?.tallerId ?? undefined },
  });
  return NextResponse.json(mecanico, { status: 201 });
}

// PATCH: update mecanico (edit name or toggle activo)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const role = (session.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'JEFE_TALLER') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const body = await req.json();
  if (!body?.id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const data: any = {};
  if (body.nombre !== undefined) data.nombre = body.nombre.trim();
  if (body.activo !== undefined) data.activo = body.activo;

  const mecanico = await prisma.mecanico.update({ where: { id: body.id }, data });
  return NextResponse.json(mecanico);
}

// DELETE: delete mecanico (only if no OTs)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const role = (session.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'JEFE_TALLER') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  const count = await prisma.ordenTrabajo.count({ where: { mecanicoId: id } });
  if (count > 0) return NextResponse.json({ error: `No se puede eliminar: tiene ${count} OT(s) asignada(s)` }, { status: 400 });

  await prisma.mecanico.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
