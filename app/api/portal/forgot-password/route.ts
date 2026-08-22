export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 8; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed } = checkRateLimit(`portal_forgot:${ip}`, 3);
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiados intentos. Espere 15 minutos.' }, { status: 429 });
  }

  try {
    const { rut } = await req.json();
    if (!rut?.trim()) return NextResponse.json({ error: 'RUT requerido' }, { status: 400 });

    const cliente = await prisma.cliente.findFirst({
      where: { rutEmpresa: rut.trim() },
      include: { taller: { select: { nombre: true, razonSocial: true } } },
    });

    // Respuesta genérica para no revelar si el RUT existe
    const okResponse = NextResponse.json({ ok: true });

    if (!cliente || !cliente.passwordHash) return okResponse;
    if (!cliente.email) return okResponse;

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);
    await prisma.cliente.update({ where: { id: cliente.id }, data: { passwordHash: hash } });

    const tallerNombre = (cliente as any).taller?.razonSocial || (cliente as any).taller?.nombre || 'El taller';

    await sendEmail({
      to: cliente.email,
      subject: 'Contraseña temporal — Portal de Clientes',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#111;margin-bottom:8px">Contraseña temporal</h2>
          <p style="color:#6b7280;margin-bottom:24px">Hola ${cliente.razonSocial ?? ''},</p>
          <p style="color:#374151">Se generó una contraseña temporal para acceder al portal de ${tallerNombre}:</p>
          <div style="background:#f3f4f6;border-radius:8px;padding:16px;text-align:center;margin:20px 0">
            <span style="font-family:monospace;font-size:24px;font-weight:700;letter-spacing:4px;color:#111">${tempPassword}</span>
          </div>
          <p style="color:#6b7280;font-size:13px">Esta contraseña es de un solo uso. Te recomendamos cambiarla desde tu perfil al ingresar.</p>
          <p style="color:#6b7280;font-size:13px">Si no solicitaste este cambio, ignora este correo.</p>
        </div>
      `,
    }).catch(() => {}); // silencioso si falla email

    return okResponse;
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
