export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json({ clientes: [], vehiculos: [], ordenes: [] });

  try {
    const search = q.toLowerCase();

    const scope = await getTallerScope();
    const tw = tallerWhere(scope!);
    const [clientes, vehiculos, ordenes] = await Promise.all([
      prisma.cliente.findMany({
        where: {
          ...tw,
          OR: [
            { razonSocial: { contains: search, mode: 'insensitive' } },
            { rutEmpresa: { contains: search, mode: 'insensitive' } },
            { nombreContacto: { contains: search, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, razonSocial: true, rutEmpresa: true, _count: { select: { vehiculos: true } } },
      }),
      prisma.vehiculo.findMany({
        where: {
          ...tw,
          OR: [
            { patente: { contains: search, mode: 'insensitive' } },
            { marca: { contains: search, mode: 'insensitive' } },
          ],
        },
        take: 5,
        include: { cliente: { select: { razonSocial: true } } },
        orderBy: { patente: 'asc' },
      }),
      // Search OT by number if query is numeric
      ...(isNaN(Number(search))
        ? [Promise.resolve([])]
        : [
            prisma.ordenTrabajo.findMany({
              where: { ...tw, otNumero: Number(search) },
              take: 5,
              include: { vehiculo: { select: { patente: true, cliente: { select: { razonSocial: true } } } } },
            }),
          ]),
    ]);

    return NextResponse.json({ clientes, vehiculos, ordenes });
  } catch (err: any) {
    console.error('Buscar error:', err);
    return NextResponse.json({ clientes: [], vehiculos: [], ordenes: [] });
  }
}
