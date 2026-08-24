export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const scope = await getTallerScope();
    const clientes = await prisma.cliente.findMany({
      where: { ...tallerWhere(scope!) },
      include: { vehiculos: true, _count: { select: { vehiculos: true } } },
      orderBy: { razonSocial: 'asc' },
    });
    return NextResponse.json(clientes ?? []);
  } catch (err: any) {
    console.error('Clientes GET error:', err);
    return NextResponse.json({ error: 'Error al cargar clientes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.razonSocial?.trim()) return NextResponse.json({ error: 'Razón social es requerida' }, { status: 400 });
    if (!body.direccion?.trim()) return NextResponse.json({ error: 'Dirección es requerida' }, { status: 400 });
    const tipoCliente = body.tipoCliente === 'PERSONA' ? 'PERSONA' : 'EMPRESA';
    if (tipoCliente !== 'PERSONA' && !body.giro?.trim()) return NextResponse.json({ error: 'Giro es requerido' }, { status: 400 });

    if (body.rutEmpresa) {
      const existe = await prisma.cliente.findFirst({ where: { rutEmpresa: body.rutEmpresa.trim() } });
      if (existe) return NextResponse.json({ error: 'Ya existe un cliente con ese RUT' }, { status: 400 });
    }

    const cliente = await prisma.cliente.create({
      data: {
        razonSocial: body.razonSocial.trim(),
        rutEmpresa: body.rutEmpresa?.trim() || null,
        giro: body.giro?.trim() || null,
        nombreContacto: body.nombreContacto?.trim() || null,
        email: body.email?.trim() || null,
        telefono: body.telefono?.trim() || null,
        direccion: body.direccion.trim(),
        tipoCliente,
        tallerId: (await getTallerScope())?.tallerId ?? undefined,
      },
      include: { vehiculos: true, _count: { select: { vehiculos: true } } },
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (err: any) {
    console.error('Clientes POST error:', err);
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}
