export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db';

if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET no está configurado');
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function GET(req: NextRequest) {
  const token = req.cookies.get('portal_token')?.value;
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const clienteId = payload.clienteId as string;

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { id: true, razonSocial: true, rutEmpresa: true, giro: true, email: true, telefono: true, direccion: true, nombreContacto: true, activo: true },
    });
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    const vehiculos = await prisma.vehiculo.findMany({
      where: { clienteId },
      orderBy: { patente: 'asc' },
    });

    const ordenes = await prisma.ordenTrabajo.findMany({
      where: { vehiculo: { clienteId } },
      include: {
        vehiculo: { select: { patente: true, marca: true, modelo: true } },
        mecanico: { select: { nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ cliente, vehiculos, ordenes });
  } catch {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }
}

// Campos que el propio cliente puede modificar desde el portal
const CAMPOS_EDITABLES = ['razonSocial', 'giro', 'email', 'telefono', 'direccion', 'nombreContacto'] as const;
const LABELS: Record<string, string> = {
  razonSocial: 'Razón social',
  giro: 'Giro',
  email: 'Email',
  telefono: 'Teléfono',
  direccion: 'Dirección',
  nombreContacto: 'Nombre de contacto',
};

async function getClienteId(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get('portal_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return (payload.clienteId as string) ?? null;
  } catch {
    return null;
  }
}

// PATCH: el cliente actualiza sus propios datos (Ley de datos personales)
export async function PATCH(req: NextRequest) {
  const clienteId = await getClienteId(req);
  if (!clienteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const actual = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!actual) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    const data: any = {};
    const cambios: string[] = [];
    for (const campo of CAMPOS_EDITABLES) {
      if (body?.[campo] !== undefined) {
        const nuevo = (body[campo] ?? '').toString().trim() || null;
        const previo = (actual as any)[campo] ?? null;
        if (nuevo !== previo) {
          data[campo] = nuevo;
          cambios.push(`${LABELS[campo]}: "${previo ?? '—'}" → "${nuevo ?? '—'}"`);
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ ok: true, sinCambios: true });
    }

    if (data.razonSocial === null) {
      return NextResponse.json({ error: 'La razón social no puede quedar vacía' }, { status: 400 });
    }

    const updated = await prisma.cliente.update({ where: { id: clienteId }, data });

    // Registrar en el historial del cliente (quién y cuándo)
    await prisma.eventoCliente.create({
      data: {
        clienteId,
        titulo: 'DATOS ACTUALIZADOS POR EL CLIENTE',
        descripcion: cambios.join(' | '),
        usuario: `${actual.razonSocial} (Portal Cliente)`,
        tipoEvento: 'datos_cliente',
      },
    });

    return NextResponse.json({
      ok: true,
      cliente: {
        id: updated.id,
        razonSocial: updated.razonSocial,
        rutEmpresa: updated.rutEmpresa,
        giro: updated.giro,
        email: updated.email,
        telefono: updated.telefono,
        direccion: updated.direccion,
        nombreContacto: updated.nombreContacto,
        activo: updated.activo,
      },
    });
  } catch (err: any) {
    console.error('Portal me PATCH error:', err);
    return NextResponse.json({ error: 'Error al actualizar datos' }, { status: 500 });
  }
}

// DELETE: el cliente desactiva/borra su cuenta y avisa al administrador
export async function DELETE(req: NextRequest) {
  const clienteId = await getClienteId(req);
  if (!clienteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    await prisma.cliente.update({ where: { id: clienteId }, data: { activo: false } });

    await prisma.eventoCliente.create({
      data: {
        clienteId,
        titulo: 'CUENTA DESACTIVADA POR EL CLIENTE',
        descripcion: 'El cliente solicitó desactivar su cuenta y dar de baja el acceso al portal (Ley de datos personales).',
        usuario: `${cliente.razonSocial} (Portal Cliente)`,
        tipoEvento: 'cuenta_desactivada',
      },
    });

    // Alertar al administrador del taller / super administrador por correo
    try {
      const appUrl = process.env.NEXTAUTH_URL;
      const admins = await prisma.user.findMany({
        where: { rol: { in: ['ADMIN'] as any }, activo: true },
        select: { email: true },
      });
      const destinatarios = admins.map((a) => a.email).filter(Boolean);
      const htmlBody = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
        <div style="background:#121212;padding:24px 32px;border-radius:8px 8px 0 0">
          <h2 style="color:#F4B63D;margin:0;font-size:18px">ÉXITO Fleet — Alerta de cuenta</h2>
        </div>
        <div style="background:#fff;padding:28px 32px;border:1px solid #e5e5e5;border-top:none">
          <p style="color:#333;font-size:15px;line-height:1.6">El cliente <strong>${cliente.razonSocial}</strong>${cliente.rutEmpresa ? ` (RUT ${cliente.rutEmpresa})` : ''} <strong>desactivó su cuenta</strong> desde el portal del cliente.</p>
          <p style="color:#555;font-size:14px;line-height:1.6">El acceso al portal quedó deshabilitado. El cliente indicó que no desea seguir usando el acceso, por lo que <strong>no debe reactivarse sin su autorización</strong>.</p>
          <p style="color:#888;font-size:12px">Fecha: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</p>
        </div>
      </div>`;
      for (const email of destinatarios) {
        await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deployment_token: process.env.ABACUSAI_API_KEY,
            app_id: process.env.WEB_APP_ID,
            notification_id: process.env.NOTIF_ID_CLIENTE_DESACTIV_SU_CUENTA,
            subject: `Cliente ${cliente.razonSocial} desactivó su cuenta`,
            body: htmlBody,
            is_html: true,
            recipient_email: email,
            sender_email: `noreply@${appUrl ? new URL(appUrl).hostname : 'exitofleet.cl'}`,
            sender_alias: 'ÉXITO Fleet',
          }),
        }).catch((e) => console.error('Alerta email error:', e));
      }
    } catch (e) {
      console.error('No se pudo enviar alerta de desactivación:', e);
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set('portal_token', '', { httpOnly: true, path: '/', maxAge: 0 });
    return res;
  } catch (err: any) {
    console.error('Portal me DELETE error:', err);
    return NextResponse.json({ error: 'Error al desactivar la cuenta' }, { status: 500 });
  }
}
