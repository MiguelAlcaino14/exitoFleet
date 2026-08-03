export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    // Verificar que el cliente pertenece al taller del usuario
    const cliente = await prisma.cliente.findFirst({ where: { id: params.id, ...tallerWhere(scope) } });
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    const contactos = await prisma.contactoCliente.findMany({
      where: { clienteId: params.id },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(contactos);
  } catch (err: any) {
    console.error('Contactos GET error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const cliente = await prisma.cliente.findFirst({ where: { id: params.id, ...tallerWhere(scope) } });
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    const body = await req.json();
    const contacto = await prisma.contactoCliente.create({
      data: {
        clienteId: params.id,
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const contactoId = searchParams.get('contactoId');
    if (!contactoId) return NextResponse.json({ error: 'contactoId requerido' }, { status: 400 });

    // A5: verificar que el contacto pertenece al cliente del URL y al taller del usuario
    const contacto = await prisma.contactoCliente.findFirst({
      where: { id: contactoId, clienteId: params.id },
      include: { cliente: { select: { tallerId: true } } },
    });

    if (!contacto) return NextResponse.json({ error: 'Contacto no encontrado' }, { status: 404 });

    if (!scope.isSuperAdmin && contacto.cliente.tallerId !== scope.tallerId) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    await prisma.contactoCliente.delete({ where: { id: contactoId } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('Contactos DELETE error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
