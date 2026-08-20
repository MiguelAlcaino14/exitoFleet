export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const role = (session.user as any)?.role;
  if (role !== 'SUPER_ADMIN') return null;
  return session;
}

// GET: list all talleres with counts
export async function GET(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const tallerId = searchParams.get('id');

    // Detail view for a single taller
    if (tallerId) {
      const taller = await prisma.taller.findUnique({
        where: { id: tallerId },
        include: {
          _count: { select: { usuarios: true, clientes: true, ordenes: true, vehiculos: true, mecanicos: true, facturas: true } },
          usuarios: { select: { id: true, email: true, nombre: true, rol: true, activo: true, createdAt: true }, orderBy: { nombre: 'asc' } },
          mecanicos: { select: { id: true, nombre: true, activo: true }, orderBy: { nombre: 'asc' } },
        },
      });
      if (!taller) return NextResponse.json({ error: 'Taller no encontrado' }, { status: 404 });
      return NextResponse.json(taller);
    }

    const talleres = await prisma.taller.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { usuarios: true, clientes: true, ordenes: true, vehiculos: true } },
      },
    });
    return NextResponse.json(talleres);
  } catch (err: any) {
    console.error('Admin talleres GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: create taller
export async function POST(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  try {
    const body = await req.json();
    if (!body?.nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    const slug = body.slug?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '') || body.nombre.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const exists = await prisma.taller.findUnique({ where: { slug } });
    if (exists) return NextResponse.json({ error: `Ya existe un taller con slug "${slug}"` }, { status: 409 });

    const taller = await prisma.taller.create({
      data: {
        nombre: body.nombre.trim(),
        slug,
        razonSocial: body.razonSocial ?? '',
        rut: body.rut ?? '',
        direccion: body.direccion ?? '',
        telefono: body.telefono ?? '',
        celular: body.celular ?? '',
        email: body.email ?? '',
        division: body.division ?? '',
        logoUrl: body.logoUrl ?? '',
        colorPrimario: body.colorPrimario ?? '#1e5fc8',
        colorFondo: body.colorFondo ?? '#121212',
      },
      include: { _count: { select: { usuarios: true, clientes: true, ordenes: true, vehiculos: true } } },
    });
    return NextResponse.json(taller, { status: 201 });
  } catch (err: any) {
    console.error('Admin talleres POST error:', err);
    return NextResponse.json({ error: 'Error al crear taller' }, { status: 500 });
  }
}

// PATCH: update taller
export async function PATCH(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  try {
    const body = await req.json();
    if (!body?.id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    const data: any = {};
    const fields = ['nombre', 'razonSocial', 'rut', 'direccion', 'telefono', 'celular', 'email', 'division', 'logoUrl', 'colorPrimario', 'colorFondo', 'activo'];
    for (const f of fields) {
      if (body[f] !== undefined) data[f] = body[f];
    }

    const taller = await prisma.taller.update({
      where: { id: body.id },
      data,
      include: { _count: { select: { usuarios: true, clientes: true, ordenes: true, vehiculos: true } } },
    });
    return NextResponse.json(taller);
  } catch (err: any) {
    console.error('Admin talleres PATCH error:', err);
    return NextResponse.json({ error: 'Error al actualizar taller' }, { status: 500 });
  }
}

// DELETE: eliminar taller (solo SUPER_ADMIN)
export async function DELETE(req: NextRequest) {
  const session = await requireSuperAdmin();
  if (!session) return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

    await prisma.taller.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Admin talleres DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar taller' }, { status: 500 });
  }
}
