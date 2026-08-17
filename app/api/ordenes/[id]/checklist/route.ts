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
  const scope = await verificarAccesoOT(params.id);
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const checklist = await prisma.checklistRecepcion.findUnique({ where: { otId: params.id } });
    return NextResponse.json(checklist);
  } catch (err: any) {
    console.error('Checklist GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await verificarAccesoOT(params.id);
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const data = {
      gato: body.gato ?? false,
      llaveRuedas: body.llaveRuedas ?? false,
      ruedaRepuesto: body.ruedaRepuesto ?? false,
      triangulos: body.triangulos ?? false,
      extintor: body.extintor ?? false,
      botiquin: body.botiquin ?? false,
      documentos: body.documentos ?? false,
      estadoCarroceria: body.estadoCarroceria ?? null,
      nivelAceite: body.nivelAceite ?? null,
      nivelLiquidoFrenos: body.nivelLiquidoFrenos ?? null,
      observaciones: body.observaciones ?? null,
    };

    const checklist = await prisma.checklistRecepcion.upsert({
      where: { otId: params.id },
      create: { otId: params.id, ...data },
      update: data,
    });
    return NextResponse.json(checklist);
  } catch (err: any) {
    console.error('Checklist PUT error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
