export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug requerido' }, { status: 400 });

  try {
    const taller = await prisma.taller.findUnique({
      where: { slug },
      select: { nombre: true, razonSocial: true, logoUrl: true, colorPrimario: true, colorFondo: true, activo: true },
    });
    if (!taller || !taller.activo) return NextResponse.json({ error: 'Taller no encontrado' }, { status: 404 });

    return NextResponse.json(taller);
  } catch (err) {
    console.error('taller-config error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
