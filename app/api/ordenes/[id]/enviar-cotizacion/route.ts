export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';
import { isValidEmail } from '@/lib/utils';
import { sendEmail } from '@/lib/email';

const MAX_DESTINATARIOS = 10;

function buildEmailHtml(params: {
  empresaNombre: string;
  configTaller: any;
  ot: any;
  itemsHtml: string;
  totalNeto: number;
  iva: number;
  totalConIva: number;
  cuentaNombre: string;
  cotizacionUrl: string;
}) {
  const { empresaNombre, configTaller, ot, itemsHtml, totalNeto, iva, totalConIva, cuentaNombre, cotizacionUrl } = params;
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');
  const otNum = String(ot.otNumero).padStart(6, '0');
  const patente = ot.vehiculo?.patente ?? '';
  const vehiculo = [ot.vehiculo?.marca, ot.vehiculo?.modelo].filter(Boolean).join(' ');
  const cliente = ot.vehiculo?.cliente?.razonSocial ?? '';

  return `
  <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:650px;margin:0 auto;background:#fff">
    <div style="background:#0a0a0a;padding:30px 40px;border-radius:8px 8px 0 0">
      <div style="color:#1e5fc8;font-size:22px;font-weight:900;letter-spacing:2px">${empresaNombre}</div>
      ${configTaller?.rut ? `<div style="color:#666;font-size:10px;letter-spacing:1px;margin-top:2px">RUT: ${configTaller.rut}${configTaller.telefono ? ` | ${configTaller.telefono}` : ''}</div>` : ''}
    </div>
    <div style="padding:30px 40px;border:1px solid #e5e5e5;border-top:none">
      <p style="color:#333;font-size:15px;line-height:1.6">Estimado/a cliente,</p>
      <p style="color:#555;font-size:14px;line-height:1.6">Adjuntamos la cotización correspondiente a la Orden de Trabajo <strong>OT-${otNum}</strong>.</p>
      <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:20px;margin:20px 0">
        <div style="margin-bottom:8px"><span style="color:#888;font-size:11px;font-weight:700">VEHÍCULO</span><br/><strong style="font-size:15px">${patente}</strong> <span style="color:#888">${vehiculo}</span></div>
        <div><span style="color:#888;font-size:11px;font-weight:700">CLIENTE</span><br/><strong>${cliente}</strong></div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #eee;border-radius:6px;overflow:hidden">
        <thead><tr style="background:#0a0a0a;color:#fff"><th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;letter-spacing:1px">DESCRIPCIÓN</th><th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700">CTDAD</th><th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700">P. UNIT.</th><th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700">TOTAL</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="background:#0a0a0a;border-radius:8px;padding:20px;margin:20px 0;color:#fff">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px"><span>Total Neto:</span><span style="font-weight:700">${fmt(totalNeto)}</span></div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;color:#888"><span>IVA (19%):</span><span>${fmt(iva)}</span></div>
        <div style="border-top:1px solid #333;padding-top:10px;display:flex;justify-content:space-between;font-size:18px;font-weight:900"><span style="color:#1e5fc8">TOTAL c/IVA:</span><span>${fmt(totalConIva)}</span></div>
      </div>
      <div style="text-align:center;margin:30px 0">
        <a href="${cotizacionUrl}" style="background:#1e5fc8;color:#fff;padding:14px 40px;border-radius:6px;font-weight:800;text-decoration:none;font-size:14px;display:inline-block">VER COTIZACIÓN ONLINE</a>
      </div>
      <p style="color:#555;font-size:14px;line-height:1.6">Quedamos atentos a su aprobación.</p>
      <p style="color:#555;font-size:14px">Saludos cordiales,<br/><strong>${empresaNombre}</strong><br/><span style="color:#888;font-size:12px">${cuentaNombre}</span></p>
    </div>
    <div style="background:#f5f5f5;padding:15px 40px;border-radius:0 0 8px 8px;border:1px solid #e5e5e5;border-top:none">
      <p style="color:#999;font-size:11px;margin:0;text-align:center">Este correo fue enviado desde ${empresaNombre}</p>
      <p style="color:#bbb;font-size:11px;margin:6px 0 0;text-align:center">El enlace de cotización estará disponible por <strong>3 días</strong> desde la fecha de envío.</p>
    </div>
  </div>`;
}

function buildItemsHtml(items: any[]): string {
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');
  const grupos = ['REPUESTO', 'INSUMO', 'SERVICIO', 'MANO_DE_OBRA', 'DESCUENTO'];
  const grupoLabels: Record<string, string> = { REPUESTO: 'Repuestos', INSUMO: 'Insumos', SERVICIO: 'Servicios', MANO_DE_OBRA: 'Mano de Obra', DESCUENTO: 'Descuentos' };

  let html = '';
  for (const g of grupos) {
    const lineas = items.filter(i => i.tipo === g);
    if (lineas.length === 0) continue;
    const subtotal = lineas.reduce((a, i) => a + i.precioVenta * i.cantidad, 0);
    html += `<tr style="background:#f8f8f8"><td colspan="4" style="padding:8px 12px;font-weight:bold;font-size:13px;color:#1e5fc8;border-bottom:1px solid #eee">${grupoLabels[g]}</td></tr>`;
    for (const item of lineas) {
      html += `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px">${item.descripcion}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px">${item.cantidad}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px">${fmt(item.precioVenta)}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;font-weight:600">${fmt(Math.round(item.precioVenta * item.cantidad))}</td></tr>`;
    }
    html += `<tr><td colspan="3" style="padding:6px 12px;text-align:right;font-size:12px;color:#888;border-bottom:2px solid #eee">Subtotal ${grupoLabels[g]}:</td><td style="padding:6px 12px;text-align:right;font-weight:bold;font-size:13px;color:#1e5fc8;border-bottom:2px solid #eee">${fmt(subtotal)}</td></tr>`;
  }
  return html;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const { destinatarios, cuentaCorreoId } = body;

    if (!destinatarios || destinatarios.length === 0) {
      return NextResponse.json({ error: 'Seleccione al menos un destinatario' }, { status: 400 });
    }

    // M3: límite de destinatarios
    if (destinatarios.length > MAX_DESTINATARIOS) {
      return NextResponse.json({ error: `Máximo ${MAX_DESTINATARIOS} destinatarios por envío` }, { status: 400 });
    }

    // M3: validar formato de cada email
    const emails: string[] = destinatarios.map((d: any) => (typeof d === 'string' ? d : d.email).trim());
    const emailInvalido = emails.find(e => !isValidEmail(e));
    if (emailInvalido) {
      return NextResponse.json({ error: `Email inválido: ${emailInvalido}` }, { status: 400 });
    }

    // M3: verificar que la OT pertenece al taller del usuario
    const ot = await prisma.ordenTrabajo.findFirst({
      where: { id: params.id, ...tallerWhere(scope) },
      include: { vehiculo: { include: { cliente: true } }, itemsValorizacion: true },
    });
    if (!ot) return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 });

    const configTaller = scope.tallerId
      ? await prisma.taller.findUnique({ where: { id: scope.tallerId } })
      : null;
    const empresaNombre = configTaller?.razonSocial || configTaller?.nombre || 'D Motor';

    let cuentaNombre = empresaNombre;
    let cuentaEmail: string | undefined;
    if (cuentaCorreoId) {
      const cuenta = await prisma.cuentaCorreo.findFirst({
        where: { id: cuentaCorreoId, ...tallerWhere(scope) },
      });
      if (cuenta) { cuentaNombre = cuenta.nombre; cuentaEmail = cuenta.email; }
    }

    const totalNeto = ot.itemsValorizacion.reduce((acc, i) => acc + i.precioVenta * i.cantidad, 0);
    const iva = Math.round(totalNeto * 0.19);
    const totalConIva = totalNeto + iva;
    const appUrl = process.env.NEXTAUTH_URL || '';

    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await prisma.ordenTrabajo.update({
      where: { id: params.id },
      data: { cotizacionExpiresAt: expiresAt },
    });

    const htmlBody = buildEmailHtml({
      empresaNombre,
      configTaller,
      ot,
      itemsHtml: buildItemsHtml(ot.itemsValorizacion),
      totalNeto,
      iva,
      totalConIva,
      cuentaNombre,
      cotizacionUrl: `${appUrl}/cotizacion/${ot.id}`,
    });

    const subject = `Cotización OT-${String(ot.otNumero).padStart(6, '0')} - ${[ot.vehiculo?.marca, ot.vehiculo?.modelo].filter(Boolean).join(' ')} - ${ot.vehiculo?.patente ?? ''}`;

    const results = await Promise.all(
      emails.map(async (email) => {
        try {
          await sendEmail({
            to: email,
            subject,
            html: htmlBody,
            fromName: cuentaNombre,
            replyTo: cuentaEmail,
          });
          return { email, success: true };
        } catch {
          return { email, success: false };
        }
      })
    );

    const nombresDestinatarios = destinatarios
      .map((d: any) => (typeof d === 'string' ? d : d.nombre || d.email))
      .join(', ');

    await prisma.eventoTimeline.create({
      data: {
        otId: params.id,
        titulo: 'COTIZACIÓN ENVIADA',
        descripcion: `Enviada a: ${nombresDestinatarios}. Desde: ${cuentaNombre}.`,
        usuario: scope.session?.user?.name ?? 'Sistema',
        tipoEvento: 'cotizacion',
      },
    });

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error('EnviarCotizacion error:', err);
    return NextResponse.json({ error: 'Error al enviar cotización' }, { status: 500 });
  }
}
