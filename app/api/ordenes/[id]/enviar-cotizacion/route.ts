export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const { destinatarios, cuentaCorreoId } = body;

    // Get sender account name
    let cuentaNombre = 'Éxito Fleet Management';
    if (cuentaCorreoId) {
      const cuenta = await prisma.cuentaCorreo.findUnique({ where: { id: cuentaCorreoId } });
      if (cuenta) cuentaNombre = cuenta.nombre;
    }

    // Get empresa config
    const configTaller = await prisma.configuracionTaller.findUnique({ where: { id: 'singleton' } });
    const empresaNombre = configTaller?.razonSocial || 'Éxito Fleet Management';

    if (!destinatarios || destinatarios.length === 0) {
      return NextResponse.json({ error: 'Seleccione al menos un destinatario' }, { status: 400 });
    }

    // Fetch OT with full data
    const ot = await prisma.ordenTrabajo.findUnique({
      where: { id: params?.id },
      include: {
        vehiculo: { include: { cliente: true } },
        itemsValorizacion: true,
      },
    });

    if (!ot) return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 });

    const otNum = String(ot.otNumero).padStart(6, '0');
    const patente = ot.vehiculo?.patente ?? '';
    const vehiculo = [ot.vehiculo?.marca, ot.vehiculo?.modelo].filter(Boolean).join(' ');
    const cliente = ot.vehiculo?.cliente?.razonSocial ?? '';

    // Calculate totals
    const totalNeto = ot.itemsValorizacion.reduce((acc, i) => acc + (i.precioVenta * i.cantidad), 0);
    const iva = Math.round(totalNeto * 0.19);
    const totalConIva = totalNeto + iva;

    const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');

    // Build items HTML grouped
    const grupos = ['REPUESTO', 'INSUMO', 'SERVICIO', 'MANO_DE_OBRA', 'DESCUENTO'];
    const grupoLabels: Record<string, string> = { REPUESTO: 'Repuestos', INSUMO: 'Insumos', SERVICIO: 'Servicios', MANO_DE_OBRA: 'Mano de Obra', DESCUENTO: 'Descuentos' };

    let itemsHtml = '';
    for (const g of grupos) {
      const lineas = ot.itemsValorizacion.filter(i => i.tipo === g);
      if (lineas.length === 0) continue;
      const subtotal = lineas.reduce((a, i) => a + i.precioVenta * i.cantidad, 0);
      itemsHtml += `<tr style="background:#f8f8f8"><td colspan="4" style="padding:8px 12px;font-weight:bold;font-size:13px;color:#F4B63D;border-bottom:1px solid #eee">${grupoLabels[g] ?? g}</td></tr>`;
      for (const item of lineas) {
        const total = Math.round(item.precioVenta * item.cantidad);
        itemsHtml += `<tr><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px">${item.descripcion}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:13px">${item.cantidad}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px">${fmt(item.precioVenta)}</td><td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:13px;font-weight:600">${fmt(total)}</td></tr>`;
      }
      itemsHtml += `<tr><td colspan="3" style="padding:6px 12px;text-align:right;font-size:12px;color:#888;border-bottom:2px solid #eee">Subtotal ${grupoLabels[g]}:</td><td style="padding:6px 12px;text-align:right;font-weight:bold;font-size:13px;color:#F4B63D;border-bottom:2px solid #eee">${fmt(subtotal)}</td></tr>`;
    }

    const appUrl = process.env.NEXTAUTH_URL || '';
    const cotizacionUrl = `${appUrl}/cotizacion/${ot.id}`;

    const htmlBody = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:650px;margin:0 auto;background:#fff">
      <div style="background:#0a0a0a;padding:30px 40px;border-radius:8px 8px 0 0">
        <div style="color:#F4B63D;font-size:22px;font-weight:900;letter-spacing:2px">${empresaNombre}</div>
        ${configTaller?.rut ? `<div style="color:#666;font-size:10px;letter-spacing:1px;margin-top:2px">RUT: ${configTaller.rut}${configTaller.telefono ? ` | ${configTaller.telefono}` : ''}</div>` : ''}
      </div>
      <div style="padding:30px 40px;border:1px solid #e5e5e5;border-top:none">
        <p style="color:#333;font-size:15px;line-height:1.6">Estimado/a cliente,</p>
        <p style="color:#555;font-size:14px;line-height:1.6">Adjuntamos la cotizaci\u00f3n correspondiente a la Orden de Trabajo <strong>OT-${otNum}</strong>.</p>
        
        <div style="background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:20px;margin:20px 0">
          <div style="display:flex;gap:20px">
            <div style="margin-bottom:8px"><span style="color:#888;font-size:11px;font-weight:700">VEH\u00cdCULO</span><br/><strong style="font-size:15px">${patente}</strong> <span style="color:#888">${vehiculo}</span></div>
          </div>
          <div><span style="color:#888;font-size:11px;font-weight:700">CLIENTE</span><br/><strong>${cliente}</strong></div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin:20px 0;border:1px solid #eee;border-radius:6px;overflow:hidden">
          <thead><tr style="background:#0a0a0a;color:#fff"><th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;letter-spacing:1px">DESCRIPCI\u00d3N</th><th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700">CTDAD</th><th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700">P. UNIT.</th><th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700">TOTAL</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <div style="background:#0a0a0a;border-radius:8px;padding:20px;margin:20px 0;color:#fff">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px"><span>Total Neto:</span><span style="font-weight:700">${fmt(totalNeto)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:14px;color:#888"><span>IVA (19%):</span><span>${fmt(iva)}</span></div>
          <div style="border-top:1px solid #333;padding-top:10px;display:flex;justify-content:space-between;font-size:18px;font-weight:900"><span style="color:#F4B63D">TOTAL c/IVA:</span><span>${fmt(totalConIva)}</span></div>
        </div>

        <div style="text-align:center;margin:30px 0">
          <a href="${cotizacionUrl}" style="background:#F4B63D;color:#000;padding:14px 40px;border-radius:6px;font-weight:800;text-decoration:none;font-size:14px;display:inline-block">VER COTIZACI\u00d3N ONLINE</a>
        </div>

        <p style="color:#555;font-size:14px;line-height:1.6">Quedamos atentos a su aprobaci\u00f3n.</p>
        <p style="color:#555;font-size:14px">Saludos cordiales,<br/><strong>${empresaNombre}</strong><br/><span style="color:#888;font-size:12px">${cuentaNombre}</span></p>
      </div>
      <div style="background:#f5f5f5;padding:15px 40px;border-radius:0 0 8px 8px;border:1px solid #e5e5e5;border-top:none">
        <p style="color:#999;font-size:11px;margin:0;text-align:center">Este correo fue enviado desde ${empresaNombre}</p>
      </div>
    </div>`;

    const subject = `Cotizaci\u00f3n OT-${otNum} - ${vehiculo} - ${patente}`;

    // Send to each recipient
    const results = [];
    for (const dest of destinatarios) {
      try {
        const response = await fetch('https://apps.abacus.ai/api/sendNotificationEmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deployment_token: process.env.ABACUSAI_API_KEY,
            app_id: process.env.WEB_APP_ID,
            notification_id: process.env.NOTIF_ID_COTIZACIN_DE_TALLER,
            subject,
            body: htmlBody,
            is_html: true,
            recipient_email: typeof dest === 'string' ? dest : dest.email,
            sender_email: `noreply@${appUrl ? new URL(appUrl).hostname : 'exitofleet.app'}`,
            sender_alias: empresaNombre,
          }),
        });
        const result = await response.json();
        const emailStr = typeof dest === 'string' ? dest : dest.email;
        results.push({ email: emailStr, success: result.success !== false });
      } catch (e: any) {
        console.error('Email send error:', e);
        const emailStr = typeof dest === 'string' ? dest : dest.email;
        results.push({ email: emailStr, success: false });
      }
    }

    // Log timeline event
    const nombresDestinatarios = destinatarios.map((d: any) => typeof d === 'string' ? d : (d.nombre || d.email)).join(', ');
    await prisma.eventoTimeline.create({
      data: {
        otId: params?.id,
        titulo: 'COTIZACI\u00d3N ENVIADA',
        descripcion: `Enviada a: ${nombresDestinatarios}. Desde: ${cuentaNombre ?? 'Sistema'}.`,
        usuario: (session as any)?.user?.name ?? 'Sistema',
        tipoEvento: 'cotizacion',
      },
    });

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error('EnviarCotizacion error:', err);
    return NextResponse.json({ error: 'Error al enviar cotizaci\u00f3n: ' + (err?.message ?? '') }, { status: 500 });
  }
}
