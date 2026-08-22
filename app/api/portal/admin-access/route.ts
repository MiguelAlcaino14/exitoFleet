export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getTallerScope } from '@/lib/taller';

// POST: crear/actualizar acceso portal de un cliente
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const rol = (session.user as any)?.role;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(rol)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  try {
    const { clienteId, password } = await req.json();
    if (!clienteId || !password) return NextResponse.json({ error: 'clienteId y password requeridos' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });

    const scope = await getTallerScope();
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, ...(scope?.tallerId ? { tallerId: scope.tallerId } : {}) },
    });
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    if (!cliente.email) return NextResponse.json({ error: 'El cliente necesita un email registrado para acceder al portal' }, { status: 400 });

    const hash = await bcrypt.hash(password, 10);
    await prisma.cliente.update({ where: { id: clienteId }, data: { passwordHash: hash } });

    return NextResponse.json({ ok: true, email: cliente.email });
  } catch (err: any) {
    return NextResponse.json({ error: 'Error al configurar acceso' }, { status: 500 });
  }
}

// DELETE: revocar acceso portal de un cliente
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const rol = (session.user as any)?.role;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(rol)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });

  try {
    const { searchParams } = new URL(req.url);
    const clienteId = searchParams.get('clienteId');
    if (!clienteId) return NextResponse.json({ error: 'clienteId requerido' }, { status: 400 });

    const scope = await getTallerScope();
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, ...(scope?.tallerId ? { tallerId: scope.tallerId } : {}) },
    });
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    await prisma.cliente.update({ where: { id: clienteId }, data: { passwordHash: null } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Error al revocar acceso' }, { status: 500 });
  }
}
