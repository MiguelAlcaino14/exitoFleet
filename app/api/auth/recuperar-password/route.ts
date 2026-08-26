export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import jwt from 'jsonwebtoken';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const { allowed } = checkRateLimit(`recuperar_password:${ip}`, 5);
  if (!allowed) {
    return NextResponse.json({ ok: true }); // misma respuesta para no revelar si fue bloqueado
  }

  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

    // Responder igual aunque el usuario no exista (seguridad)
    if (!user || !user.activo) {
      return NextResponse.json({ ok: true });
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });

    // hashSig: primeros 12 chars del passwordHash actual — el token queda inválido si la contraseña cambia
    const hashSig = (user.passwordHash ?? '').slice(0, 12);
    const token = jwt.sign(
      { email: user.email, purpose: 'reset-password', hashSig },
      secret,
      { expiresIn: '1h' }
    );

    const baseUrl = process.env.NEXTAUTH_URL ?? 'https://app.dmotor.cl';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Recuperar contraseña — D Motor',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
          <h2 style="font-size:20px;font-weight:700;color:#111;margin-bottom:8px">Recuperar contraseña</h2>
          <p style="color:#555;margin-bottom:24px">Hola ${user.nombre}, recibimos una solicitud para restablecer tu contraseña en D Motor.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#F4B63D;color:#111;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:15px">
            Restablecer contraseña
          </a>
          <p style="color:#888;font-size:13px;margin-top:24px">Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('recuperar-password error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
