export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

const ROLES_GESTION = ['ADMIN', 'JEFE_TALLER', 'SUPER_ADMIN'];

export async function GET(req: NextRequest) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const soloActivos = searchParams.get('activos') === '1';

  const mecanicos = await prisma.mecanico.findMany({
    where: { ...tallerWhere(scope), ...(soloActivos ? { activo: true } : {}) },
    orderBy: { nombre: 'asc' },
  });
  return NextResponse.json(mecanicos);
}

export async function POST(req: NextRequest) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!ROLES_GESTION.includes(scope.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const body = await req.json();
  if (!body?.nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

  const mecanico = await prisma.mecanico.create({
    data: {
      nombre: body.nombre.trim(),
      rut: body.rut?.trim() || null,
      telefono: body.telefono?.trim() || null,
      email: body.email?.trim() || null,
      tallerId: scope.tallerId ?? undefined,
    },
  });
  return NextResponse.json(mecanico, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!ROLES_GESTION.includes(scope.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const body = await req.json();
  if (!body?.id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  // M9: verificar que el mecánico pertenece al taller del usuario
  const mecanico = await prisma.mecanico.findFirst({ where: { id: body.id, ...tallerWhere(scope) } });
  if (!mecanico) return NextResponse.json({ error: 'Mecánico no encontrado' }, { status: 404 });

  const data: any = {};
  if (body.nombre !== undefined) data.nombre = body.nombre.trim();
  if (body.activo !== undefined) data.activo = body.activo;
  if (body.rut !== undefined) data.rut = body.rut?.trim() || null;
  if (body.telefono !== undefined) data.telefono = body.telefono?.trim() || null;
  if (body.email !== undefined) data.email = body.email?.trim() || null;

  const updated = await prisma.mecanico.update({ where: { id: body.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!ROLES_GESTION.includes(scope.role)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

  // M9: verificar que el mecánico pertenece al taller del usuario
  const mecanico = await prisma.mecanico.findFirst({ where: { id, ...tallerWhere(scope) } });
  if (!mecanico) return NextResponse.json({ error: 'Mecánico no encontrado' }, { status: 404 });

  const count = await prisma.ordenTrabajo.count({ where: { mecanicoId: id } });
  if (count > 0) return NextResponse.json({ error: `No se puede eliminar: tiene ${count} OT(s) asignada(s)` }, { status: 400 });

  await prisma.mecanico.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
