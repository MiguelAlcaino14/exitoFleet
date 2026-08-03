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
    // Get all facturas grouped by month
    const scope = await getTallerScope();
    const tw = tallerWhere(scope!);
    const facturas = await prisma.factura.findMany({
      where: tw,
      orderBy: { fechaEmision: 'desc' },
      select: {
        id: true,
        numero: true,
        montoNeto: true,
        iva: true,
        montoTotal: true,
        fechaEmision: true,
      },
    });

    // OTs por facturar
    const porFacturar = await prisma.ordenTrabajo.findMany({
      where: { ...tw, estado: 'POR_FACTURAR' },
      include: {
        vehiculo: { select: { patente: true, cliente: { select: { razonSocial: true } } } },
      },
      orderBy: { fechaIngreso: 'desc' },
    });

    // Monthly summary
    const mesesMap = new Map<string, { neto: number; iva: number; total: number; count: number }>();
    for (const f of facturas) {
      const d = new Date(f.fechaEmision);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const existing = mesesMap.get(key) ?? { neto: 0, iva: 0, total: 0, count: 0 };
      existing.neto += f.montoNeto;
      existing.iva += f.iva;
      existing.total += f.montoTotal;
      existing.count += 1;
      mesesMap.set(key, existing);
    }

    const resumenMensual = Array.from(mesesMap.entries())
      .map(([key, val]) => ({ periodo: key, ...val }))
      .sort((a, b) => b.periodo.localeCompare(a.periodo));

    // Yearly summary
    const aniosMap = new Map<number, { neto: number; iva: number; total: number; count: number }>();
    for (const f of facturas) {
      const y = new Date(f.fechaEmision).getUTCFullYear();
      const existing = aniosMap.get(y) ?? { neto: 0, iva: 0, total: 0, count: 0 };
      existing.neto += f.montoNeto;
      existing.iva += f.iva;
      existing.total += f.montoTotal;
      existing.count += 1;
      aniosMap.set(y, existing);
    }

    const resumenAnual = Array.from(aniosMap.entries())
      .map(([anio, val]) => ({ anio, ...val }))
      .sort((a, b) => b.anio - a.anio);

    const totalFacturado = facturas.reduce((s, f) => s + f.montoTotal, 0);
    const totalPorFacturar = porFacturar.reduce((s, o) => s + (o.valorTotal ?? 0), 0);

    return NextResponse.json({
      totalFacturado,
      totalPorFacturar,
      cantidadFacturas: facturas.length,
      cantidadPorFacturar: porFacturar.length,
      porFacturar,
      resumenMensual,
      resumenAnual,
    });
  } catch (err: any) {
    console.error('Finanzas GET error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
