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
    const { searchParams } = new URL(req.url);
    const anio = searchParams.get('anio');
    const mes = searchParams.get('mes');

    const where: any = {};
    if (anio && mes) {
      const start = new Date(Number(anio), Number(mes) - 1, 1);
      const end = new Date(Number(anio), Number(mes), 1);
      where.fechaEmision = { gte: start, lt: end };
    } else if (anio) {
      const start = new Date(Number(anio), 0, 1);
      const end = new Date(Number(anio) + 1, 0, 1);
      where.fechaEmision = { gte: start, lt: end };
    }

    const scope = await getTallerScope();
    Object.assign(where, tallerWhere(scope!));
    const facturas = await prisma.factura.findMany({
      where,
      include: {
        ordenTrabajo: {
          select: {
            otNumero: true,
            vehiculo: { select: { patente: true, cliente: { select: { razonSocial: true } } } },
          },
        },
      },
      orderBy: { fechaEmision: 'desc' },
    });

    return NextResponse.json(facturas);
  } catch (err: any) {
    console.error('Facturas GET error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    if (!body?.numero || !body?.otId) {
      return NextResponse.json({ error: 'Número y OT son requeridos' }, { status: 400 });
    }

    const montoNeto = parseFloat(body.montoNeto) || 0;
    const iva = parseFloat(body.iva) || Math.round(montoNeto * 0.19);
    const montoTotal = parseFloat(body.montoTotal) || montoNeto + iva;

    const factura = await prisma.factura.create({
      data: {
        numero: body.numero,
        otId: body.otId,
        montoNeto,
        iva,
        montoTotal,
        fechaEmision: body.fechaEmision ? new Date(body.fechaEmision) : new Date(),
        observaciones: body.observaciones ?? null,
        tallerId: (await getTallerScope())?.tallerId ?? undefined,
      },
      include: {
        ordenTrabajo: {
          select: {
            otNumero: true,
            vehiculo: { select: { patente: true, cliente: { select: { razonSocial: true } } } },
          },
        },
      },
    });

    // Also advance OT to CERRADA if POR_FACTURAR
    const ot = await prisma.ordenTrabajo.findUnique({ where: { id: body.otId } });
    if (ot?.estado === 'POR_FACTURAR') {
      await prisma.ordenTrabajo.update({
        where: { id: body.otId },
        data: { estado: 'CERRADA', fechaFacturacion: new Date() },
      });
    }

    return NextResponse.json(factura, { status: 201 });
  } catch (err: any) {
    console.error('Facturas POST error:', err);
    if (err?.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe una factura con ese número' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear factura' }, { status: 500 });
  }
}
