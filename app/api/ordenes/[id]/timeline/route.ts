export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const eventos = await prisma.eventoTimeline.findMany({
      where: { otId: params?.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(eventos);
  } catch (err: any) {
    console.error('Timeline GET error:', err);
    return NextResponse.json({ error: 'Error al cargar timeline' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const evento = await prisma.eventoTimeline.create({
      data: {
        otId: params?.id,
        titulo: body?.titulo ?? 'Nota',
        descripcion: body?.descripcion ?? '',
        usuario: (session as any)?.user?.name ?? 'Sistema',
        tipoEvento: body?.tipoEvento ?? 'nota',
      },
    });
    return NextResponse.json(evento, { status: 201 });
  } catch (err: any) {
    console.error('Timeline POST error:', err);
    return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 });
  }
}
