export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const contactos = await prisma.contactoCliente.findMany({
      where: { clienteId: params?.id },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(contactos);
  } catch (err: any) {
    console.error('Contactos GET error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const contacto = await prisma.contactoCliente.create({
      data: {
        clienteId: params?.id,
        nombre: body?.nombre ?? '',
        cargo: body?.cargo ?? null,
        email: body?.email ?? '',
        telefono: body?.telefono ?? null,
        predeterminado: body?.predeterminado ?? false,
      },
    });
    return NextResponse.json(contacto, { status: 201 });
  } catch (err: any) {
    console.error('Contactos POST error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const contactoId = searchParams.get('contactoId');
    if (!contactoId) return NextResponse.json({ error: 'contactoId requerido' }, { status: 400 });
    await prisma.contactoCliente.delete({ where: { id: contactoId } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Contactos DELETE error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
