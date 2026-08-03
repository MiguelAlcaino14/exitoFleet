export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTallerScope } from '@/lib/taller';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const scope = await getTallerScope();
    // Si el usuario pertenece a un taller, usar datos del taller
    if (scope?.tallerId) {
      const taller = await prisma.taller.findUnique({ where: { id: scope.tallerId } });
      if (taller) return NextResponse.json({ id: taller.id, razonSocial: taller.razonSocial, rut: taller.rut, direccion: taller.direccion, telefono: taller.telefono, celular: taller.celular, email: taller.email, division: taller.division, logoUrl: taller.logoUrl });
    }
    let config = await prisma.configuracionTaller.findUnique({ where: { id: 'singleton' } });
    if (!config) {
      config = await prisma.configuracionTaller.create({ data: { id: 'singleton' } });
    }
    return NextResponse.json(config);
  } catch (err: any) {
    console.error('ConfiguracionTaller GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const scope = await getTallerScope();

    // Si el usuario pertenece a un taller, actualizar el taller
    if (scope?.tallerId) {
      const taller = await prisma.taller.update({
        where: { id: scope.tallerId },
        data: {
          razonSocial: body.razonSocial ?? '',
          rut: body.rut ?? '',
          direccion: body.direccion ?? '',
          telefono: body.telefono ?? '',
          celular: body.celular ?? '',
          email: body.email ?? '',
          division: body.division ?? '',
          logoUrl: body.logoUrl ?? '',
        },
      });
      return NextResponse.json({ id: taller.id, razonSocial: taller.razonSocial, rut: taller.rut, direccion: taller.direccion, telefono: taller.telefono, celular: taller.celular, email: taller.email, division: taller.division, logoUrl: taller.logoUrl });
    }

    const config = await prisma.configuracionTaller.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        razonSocial: body.razonSocial ?? '',
        rut: body.rut ?? '',
        direccion: body.direccion ?? '',
        telefono: body.telefono ?? '',
        celular: body.celular ?? '',
        email: body.email ?? '',
        division: body.division ?? '',
        logoUrl: body.logoUrl ?? '',
      },
      update: {
        razonSocial: body.razonSocial ?? '',
        rut: body.rut ?? '',
        direccion: body.direccion ?? '',
        telefono: body.telefono ?? '',
        celular: body.celular ?? '',
        email: body.email ?? '',
        division: body.division ?? '',
        logoUrl: body.logoUrl ?? '',
      },
    });
    return NextResponse.json(config);
  } catch (err: any) {
    console.error('ConfiguracionTaller PUT error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
