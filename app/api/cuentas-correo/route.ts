export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function GET() {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const cuentas = await prisma.cuentaCorreo.findMany({
      where: { ...tallerWhere(scope), activa: true },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(cuentas);
  } catch (err: any) {
    console.error('CuentasCorreo GET error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  // A8: solo ADMIN puede crear cuentas de correo
  if (scope.role !== 'ADMIN' && scope.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const body = await req.json();
    if (!body?.nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    const emailRaw = body?.email?.trim() ?? '';
    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }
    const cuenta = await prisma.cuentaCorreo.create({
      data: {
        nombre: body.nombre.trim(),
        email: emailRaw,
        predeterminada: body?.predeterminada ?? false,
        tallerId: scope.tallerId ?? undefined,
      },
    });
    return NextResponse.json(cuenta, { status: 201 });
  } catch (err: any) {
    console.error('CuentasCorreo POST error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  // A8: solo ADMIN puede eliminar cuentas de correo
  if (scope.role !== 'ADMIN' && scope.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

    // A8: verificar que la cuenta pertenece al taller del usuario
    const cuenta = await prisma.cuentaCorreo.findFirst({
      where: { id, ...tallerWhere(scope) },
    });
    if (!cuenta) return NextResponse.json({ error: 'Cuenta no encontrada' }, { status: 404 });

    await prisma.cuentaCorreo.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('CuentasCorreo DELETE error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
