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
    const scope = await getTallerScope();
    const tw = tallerWhere(scope!);
    const [porDiag, enCot, espAprob, enTrab, porFact, cerradas, allActive, ultimasOTs] = await Promise.all([
      prisma.ordenTrabajo.count({ where: { ...tw, estado: 'POR_DIAGNOSTICAR' } }),
      prisma.ordenTrabajo.count({ where: { ...tw, estado: 'EN_COTIZACION' } }),
      prisma.ordenTrabajo.count({ where: { ...tw, estado: 'ESPERANDO_APROBACION' } }),
      prisma.ordenTrabajo.count({ where: { ...tw, estado: 'EN_TRABAJO' } }),
      prisma.ordenTrabajo.aggregate({ where: { ...tw, estado: 'POR_FACTURAR' }, _sum: { valorTotal: true }, _count: true }),
      prisma.ordenTrabajo.count({ where: { ...tw, estado: 'CERRADA' } }),
      prisma.ordenTrabajo.count({ where: { ...tw, estado: { notIn: ['CERRADA'] } } }),
      prisma.ordenTrabajo.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        where: { ...tw, estado: { not: 'CERRADA' } },
        include: { vehiculo: { include: { cliente: { select: { razonSocial: true } } } } },
      }),
    ]);

    // Alertas
    const alertas: any[] = [];
    const otsPendAprobacion = await prisma.ordenTrabajo.findMany({
      where: { ...tw, estado: 'ESPERANDO_APROBACION' },
      include: { vehiculo: { include: { cliente: true } } },
    });
    for (const ot of otsPendAprobacion) {
      const dias = Math.floor((Date.now() - new Date(ot.fechaValorizacion ?? ot.createdAt).getTime()) / 86400000);
      if (dias >= 3) {
        alertas.push({ id: ot.id, tipo: 'aprobacion', otNumero: ot.otNumero, patente: ot.vehiculo?.patente, cliente: ot.vehiculo?.cliente?.razonSocial, dias });
      }
    }
    const otsPendDiag = await prisma.ordenTrabajo.findMany({
      where: { ...tw, estado: 'POR_DIAGNOSTICAR' },
      include: { vehiculo: { include: { cliente: true } } },
    });
    for (const ot of otsPendDiag) {
      const horas = (Date.now() - new Date(ot.fechaIngreso).getTime()) / 3600000;
      if (horas >= 3) {
        alertas.push({ id: ot.id, tipo: 'diagnostico', otNumero: ot.otNumero, patente: ot.vehiculo?.patente, cliente: ot.vehiculo?.cliente?.razonSocial });
      }
    }

    return NextResponse.json({
      kpis: {
        diagnosticosPendientes: { count: porDiag },
        enCotizacion: { count: enCot },
        esperandoAprobacion: { count: espAprob },
        enTrabajo: { count: enTrab },
        porFacturar: { count: porFact._count, valor: porFact._sum?.valorTotal ?? 0 },
        cerradas: { count: cerradas },
      },
      totalOTsActivas: allActive,
      alertas,
      ultimasOTs,
    });
  } catch (err: any) {
    console.error('Dashboard error:', err);
    return NextResponse.json({ error: 'Error al cargar dashboard' }, { status: 500 });
  }
}
