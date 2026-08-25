export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const buscar = url.searchParams.get('buscar')?.toLowerCase();
    const tipo = url.searchParams.get('tipo');
    const page = parseInt(url.searchParams.get('page') ?? '1');
    const pageSize = 20;

    const scope = await getTallerScope();
    const where: any = { ...tallerWhere(scope!) };

    if (tipo && tipo !== 'TODOS') {
      where.tipoVehiculo = tipo;
    }

    if (buscar) {
      where.OR = [
        { patente: { contains: buscar, mode: 'insensitive' } },
        { marca: { contains: buscar, mode: 'insensitive' } },
        { modelo: { contains: buscar, mode: 'insensitive' } },
        { cliente: { razonSocial: { contains: buscar, mode: 'insensitive' } } },
      ];
    }

    const [vehiculos, total] = await Promise.all([
      prisma.vehiculo.findMany({
        where,
        include: {
          cliente: { select: { id: true, razonSocial: true } },
          _count: { select: { ordenes: true } },
        },
        orderBy: { patente: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.vehiculo.count({ where }),
    ]);

    return NextResponse.json({
      vehiculos: vehiculos ?? [],
      total,
      page,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    console.error('Vehiculos GET error:', err);
    return NextResponse.json({ error: 'Error al cargar vehículos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.patente?.trim()) return NextResponse.json({ error: 'Patente es requerida' }, { status: 400 });
    if (!body.clienteId) return NextResponse.json({ error: 'Debe asignar un cliente' }, { status: 400 });

    const vtScope = await getTallerScope();
    const vtid = vtScope?.tallerId ?? undefined;
    if (!vtid) return NextResponse.json({ error: 'Usuario no tiene taller asignado' }, { status: 403 });

    const existe = await prisma.vehiculo.findFirst({ where: { patente: body.patente.trim().toUpperCase() } });
    if (existe) return NextResponse.json({ error: 'Ya existe un vehículo con esa patente' }, { status: 400 });

    const vinLimpio = body.vin?.trim() || null;
    if (vinLimpio) {
      const existeVin = await prisma.vehiculo.findFirst({ where: { vin: vinLimpio } });
      if (existeVin) return NextResponse.json({ error: `El VIN ${vinLimpio} ya está registrado en el vehículo ${existeVin.patente}` }, { status: 400 });
    }

    const vehiculo = await prisma.vehiculo.create({
      data: {
        patente: body.patente.trim().toUpperCase(),
        marca: body.marca?.trim() || null,
        modelo: body.modelo?.trim() || null,
        tipoVehiculo: body.tipoVehiculo?.trim() || null,
        anio: body.anio ? parseInt(body.anio) : null,
        motor: body.motor?.trim() || null,
        chasis: vinLimpio,
        vin: vinLimpio,
        clienteId: body.clienteId,
        tallerId: vtid,
      },
      include: {
        cliente: { select: { id: true, razonSocial: true } },
        _count: { select: { ordenes: true } },
      },
    });
    return NextResponse.json(vehiculo, { status: 201 });
  } catch (err: any) {
    console.error('Vehiculos POST error:', err);
    return NextResponse.json({ error: 'Error al crear vehículo' }, { status: 500 });
  }
}
