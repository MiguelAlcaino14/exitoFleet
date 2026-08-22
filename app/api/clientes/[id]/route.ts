export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getTallerScope, tallerWhere } from '@/lib/taller';
import { sendEmail } from '@/lib/email';

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
    if (body?.tipoCliente !== undefined && ['EMPRESA', 'PERSONA'].includes(body.tipoCliente)) data.tipoCliente = body.tipoCliente;
    if (body?.razonSocial !== undefined) data.razonSocial = body.razonSocial;
    if (body?.rutEmpresa !== undefined) data.rutEmpresa = body.rutEmpresa || null;
    if (body?.giro !== undefined) data.giro = body.giro || null;
    if (body?.nombreContacto !== undefined) data.nombreContacto = body.nombreContacto;
    if (body?.email !== undefined) data.email = body.email;
    if (body?.telefono !== undefined) data.telefono = body.telefono;
    if (body?.direccion !== undefined) data.direccion = body.direccion;
    const settingPassword = body?.portalPassword !== undefined && body.portalPassword.trim();
    if (settingPassword) {
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
        taller: { select: { slug: true } },
        _count: { select: { vehiculos: true } },
      },
    });

    if (settingPassword && updated.email) {
      try {
        const baseUrl = process.env.NEXTAUTH_URL ?? '';
        const tallerSlug = (updated as any).taller?.slug;
        const portalUrl = tallerSlug ? `${baseUrl}/portal/login?taller=${tallerSlug}` : `${baseUrl}/portal/login`;
        await sendEmail({
          to: updated.email,
          subject: 'Acceso a tu Portal de Clientes - D Motor',
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff">
              <h2 style="color:#1a1a2e;margin-bottom:8px">Portal de Clientes</h2>
              <p style="color:#555;margin-bottom:24px">Hola${updated.nombreContacto ? ` ${updated.nombreContacto}` : ''},</p>
              <p style="color:#555">Tu taller ha activado tu acceso al <strong>Portal de Clientes D Motor</strong>. Desde ahí puedes revisar el estado de tus vehículos y órdenes de trabajo.</p>
              <div style="background:#f5f5f5;border-radius:8px;padding:20px;margin:24px 0">
                <p style="margin:0 0 8px;font-size:13px;color:#888">RUT Empresa (usuario)</p>
                <p style="margin:0 0 16px;font-size:16px;font-weight:bold;color:#1a1a2e">${updated.rutEmpresa ?? '—'}</p>
                <p style="margin:0 0 8px;font-size:13px;color:#888">Contraseña</p>
                <p style="margin:0;font-size:16px;font-weight:bold;color:#1a1a2e">${body.portalPassword}</p>
              </div>
              <a href="${portalUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Ingresar al Portal</a>
              <p style="margin-top:24px;font-size:12px;color:#aaa">D Motor — Sistema de gestión de taller</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Error al enviar email de acceso portal:', emailErr);
      }
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error('Cliente PATCH error:', err);
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}
