export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db';

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('portal_token')?.value;
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const clienteId = payload.clienteId as string;

    const orden = await prisma.ordenTrabajo.findUnique({
      where: { id: params.id },
      include: {
        vehiculo: { include: { cliente: { select: { id: true, razonSocial: true } } } },
        mecanico: { select: { nombre: true } },
        itemsValorizacion: { orderBy: { orden: 'asc' } },
        eventosTimeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!orden || orden.vehiculo.cliente.id !== clienteId) {
      return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 });
    }

    return NextResponse.json(orden);
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }
}
