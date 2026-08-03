export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTallerScope } from '@/lib/taller';

// Devuelve descripciones usadas anteriormente (memoria/autocompletado) con su
// último costo, margen y tipo para valorizar más rápido.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') ?? '').trim();

    // Traemos items recientes; agrupamos por descripción conservando el más reciente.
    const scope = await getTallerScope();
    const tallerFilter = scope?.isSuperAdmin ? {} : (scope?.tallerId ? { ordenTrabajo: { tallerId: scope.tallerId } } : {});
    const items = await prisma.itemValorizacion.findMany({
      where: {
        ...tallerFilter,
        ...(q ? { descripcion: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 400,
      select: {
        descripcion: true,
        tipo: true,
        costoUnitario: true,
        margen: true,
        precioVenta: true,
        createdAt: true,
      },
    });

    const vistos = new Map<string, any>();
    for (const it of items) {
      const desc = (it.descripcion ?? '').trim();
      if (!desc) continue;
      const key = desc.toLowerCase();
      if (!vistos.has(key)) {
        vistos.set(key, {
          descripcion: desc,
          tipo: it.tipo,
          costoUnitario: it.costoUnitario,
          margen: it.margen,
          precioVenta: it.precioVenta,
        });
      }
    }

    const sugerencias = Array.from(vistos.values()).slice(0, 30);
    return NextResponse.json(sugerencias);
  } catch (err: any) {
    console.error('Sugerencias items GET error:', err);
    return NextResponse.json([], { status: 200 });
  }
}
