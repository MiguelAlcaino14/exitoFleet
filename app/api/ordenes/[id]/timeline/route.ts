export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

async function verificarAccesoOT(otId: string) {
  const scope = await getTallerScope();
  if (!scope) return null;
  const orden = await prisma.ordenTrabajo.findFirst({ where: { id: otId, ...tallerWhere(scope) } });
  return orden ? scope : null;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await verificarAccesoOT(params?.id);
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
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
  const scope = await verificarAccesoOT(params?.id);
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    const body = await req.json();
    const evento = await prisma.eventoTimeline.create({
      data: {
        otId: params?.id,
        titulo: body?.titulo ?? 'Nota',
        descripcion: body?.descripcion ?? '',
        usuario: (scope.session as any)?.user?.name ?? 'Sistema',
        tipoEvento: body?.tipoEvento ?? 'nota',
      },
    });
    return NextResponse.json(evento, { status: 201 });
  } catch (err: any) {
    console.error('Timeline POST error:', err);
    return NextResponse.json({ error: 'Error al crear evento' }, { status: 500 });
  }
}
