export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id: params.id, ...tallerWhere(scope) },
      include: {
        vehiculos: {
          include: {
            ordenes: {
              orderBy: { fechaIngreso: 'desc' },
              select: {
                id: true,
                otNumero: true,
                estado: true,
                motivoIngreso: true,
                fechaIngreso: true,
                valorTotal: true,
                diagnosticoMecanico: true,
              },
            },
          },
          orderBy: { patente: 'asc' },
        },
        contactos: { orderBy: { predeterminado: 'desc' } },
        eventos: { orderBy: { createdAt: 'desc' }, take: 50 },
        _count: { select: { vehiculos: true } },
      },
    });

    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    return NextResponse.json({ ...cliente, passwordHash: !!cliente.passwordHash });
  } catch (err: any) {
    console.error('Cliente GET error:', err);
    return NextResponse.json({ error: 'Error al cargar cliente' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (scope.role !== 'ADMIN' && scope.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const cliente = await prisma.cliente.findFirst({
      where: { id: params.id, ...tallerWhere(scope) },
    });
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    const vehiculosConOTs = await prisma.vehiculo.findMany({
      where: { clienteId: params.id },
      include: { _count: { select: { ordenes: true } } },
    });

    const tieneOTs = vehiculosConOTs.some((v: any) => v._count.ordenes > 0);
    if (tieneOTs) {
      return NextResponse.json(
        { error: 'No se puede eliminar este cliente porque tiene órdenes de trabajo asociadas. Elimine primero las OTs.' },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.contactoCliente.deleteMany({ where: { clienteId: params.id } }),
      prisma.vehiculo.deleteMany({ where: { clienteId: params.id } }),
      prisma.cliente.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Cliente DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();

    // Solo ADMIN puede cambiar el password del portal del cliente
    if (body?.portalPassword !== undefined) {
      if (scope.role !== 'ADMIN' && scope.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
      }
    }

    const cliente = await prisma.cliente.findFirst({
      where: { id: params.id, ...tallerWhere(scope) },
    });
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    const data: any = {};
    if (body?.razonSocial !== undefined) data.razonSocial = body.razonSocial;
    if (body?.rutEmpresa !== undefined) data.rutEmpresa = body.rutEmpresa || null;
    if (body?.giro !== undefined) data.giro = body.giro || null;
    if (body?.nombreContacto !== undefined) data.nombreContacto = body.nombreContacto;
    if (body?.email !== undefined) data.email = body.email;
    if (body?.telefono !== undefined) data.telefono = body.telefono;
    if (body?.direccion !== undefined) data.direccion = body.direccion;
    if (body?.portalPassword !== undefined && body.portalPassword.trim()) {
      data.passwordHash = await bcrypt.hash(body.portalPassword, 10);
    }

    const updated = await prisma.cliente.update({
      where: { id: params.id },
      data,
      include: {
        vehiculos: {
          include: {
            ordenes: {
              orderBy: { fechaIngreso: 'desc' },
              select: {
                id: true,
                otNumero: true,
                estado: true,
                motivoIngreso: true,
                fechaIngreso: true,
                valorTotal: true,
                diagnosticoMecanico: true,
              },
            },
          },
          orderBy: { patente: 'asc' },
        },
        contactos: { orderBy: { predeterminado: 'desc' } },
        _count: { select: { vehiculos: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Cliente PATCH error:', err);
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}
