export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const patente = req.nextUrl.searchParams.get('patente');
  if (!patente) return NextResponse.json({ error: 'Patente requerida' }, { status: 400 });

  try {
    const scope = await getTallerScope();
    const vehiculo = await prisma.vehiculo.findFirst({
      where: { ...tallerWhere(scope!), patente: { equals: patente.toUpperCase().trim(), mode: 'insensitive' } },
      include: { cliente: true },
    });
    if (!vehiculo) return NextResponse.json({ found: false });
    // Último km registrado en OTs de este vehículo
    const lastOt = await prisma.ordenTrabajo.findFirst({
      where: { vehiculoId: vehiculo.id, kilometraje: { not: null } },
      orderBy: { fechaIngreso: 'desc' },
      select: { kilometraje: true },
    });
    return NextResponse.json({ found: true, vehiculo: { ...vehiculo, lastKm: lastOt?.kilometraje ?? null } });
  } catch (err: any) {
    console.error('Buscar vehículo error:', err);
    return NextResponse.json({ error: 'Error al buscar' }, { status: 500 });
  }
}
