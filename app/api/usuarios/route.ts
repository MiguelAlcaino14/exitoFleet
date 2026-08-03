export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const scope = await getTallerScope();
    const users = await prisma.user.findMany({
      where: { ...tallerWhere(scope!), rol: { not: 'SUPER_ADMIN' } },
      select: { id: true, email: true, nombre: true, rol: true, activo: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(users);
  } catch (err: any) {
    console.error('Usuarios GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const callerRole = (session.user as any).role;
  if (callerRole !== 'ADMIN' && callerRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Solo administradores pueden crear usuarios' }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body.email || !body.password || !body.nombre) {
      return NextResponse.json({ error: 'email, password y nombre son requeridos' }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        nombre: body.nombre,
        rol: body.rol ?? 'JEFE_TALLER',
        activo: true,
        tallerId: body.tallerId ?? (await getTallerScope())?.tallerId ?? undefined,
      },
      select: { id: true, email: true, nombre: true, rol: true, activo: true, createdAt: true },
    });
    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    console.error('Usuarios POST error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const patchRole = (session.user as any).role;
  if (patchRole !== 'ADMIN' && patchRole !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    const data: any = {};
    if (body.nombre !== undefined) data.nombre = body.nombre;
    if (body.rol !== undefined) data.rol = body.rol;
    if (body.activo !== undefined) data.activo = body.activo;
    if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.update({
      where: { id: body.id },
      data,
      select: { id: true, email: true, nombre: true, rol: true, activo: true, createdAt: true },
    });
    return NextResponse.json(user);
  } catch (err: any) {
    console.error('Usuarios PATCH error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
