export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const estado = url.searchParams.get('estado');
    const desde = url.searchParams.get('desde');
    const hasta = url.searchParams.get('hasta');
    const buscar = url.searchParams.get('buscar')?.toLowerCase();
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = 20;

    const scope = await getTallerScope();
    const where: any = { ...tallerWhere(scope!) };

    if (estado && estado !== 'TODAS') {
      where.estado = estado;
    }

    if (desde || hasta) {
      where.fechaIngreso = {};
      if (desde) where.fechaIngreso.gte = new Date(desde);
      if (hasta) {
        const h = new Date(hasta);
        h.setHours(23, 59, 59, 999);
        where.fechaIngreso.lte = h;
      }
    }

    if (buscar) {
      where.OR = [
        { vehiculo: { patente: { contains: buscar, mode: 'insensitive' } } },
        { vehiculo: { cliente: { razonSocial: { contains: buscar, mode: 'insensitive' } } } },
        { motivoIngreso: { contains: buscar, mode: 'insensitive' } },
      ];
      // Also try matching OT number
      const otNum = parseInt(buscar.replace(/\D/g, ''));
      if (!isNaN(otNum) && otNum > 0) {
        where.OR.push({ otNumero: otNum });
      }
    }

    const [ordenes, total] = await Promise.all([
      prisma.ordenTrabajo.findMany({
        where,
        include: {
          vehiculo: { include: { cliente: { select: { razonSocial: true } } } },
          usuarioCreador: { select: { nombre: true } },
          _count: { select: { itemsValorizacion: true, fotografias: true } },
        },
        orderBy: { otNumero: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ordenTrabajo.count({ where }),
    ]);

    // Stats
    const stats = await prisma.ordenTrabajo.groupBy({
      by: ['estado'],
      where: { ...tallerWhere(scope!) },
      _count: true,
    });

    return NextResponse.json({
      ordenes: ordenes ?? [],
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
      stats: stats ?? [],
    });
  } catch (err: any) {
    console.error('Historial GET error:', err);
    return NextResponse.json({ error: 'Error al cargar historial' }, { status: 500 });
  }
}
