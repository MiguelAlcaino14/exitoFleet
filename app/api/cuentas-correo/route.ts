export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const scope = await getTallerScope();
    const cuentas = await prisma.cuentaCorreo.findMany({ where: { ...tallerWhere(scope!), activa: true }, orderBy: { nombre: 'asc' } });
    return NextResponse.json(cuentas);
  } catch (err: any) {
    console.error('CuentasCorreo GET error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const cuenta = await prisma.cuentaCorreo.create({
      data: {
        nombre: body?.nombre ?? '',
        email: body?.email ?? '',
        predeterminada: body?.predeterminada ?? false,
        tallerId: (await getTallerScope())?.tallerId ?? undefined,
      },
    });
    return NextResponse.json(cuenta, { status: 201 });
  } catch (err: any) {
    console.error('CuentasCorreo POST error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    await prisma.cuentaCorreo.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('CuentasCorreo DELETE error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
