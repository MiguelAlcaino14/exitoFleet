export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const { allowed } = checkRateLimit(`reset_password:${ip}`, 5);
  if (!allowed) {
    return NextResponse.json({ error: 'Demasiados intentos. Espere 15 minutos.' }, { status: 429 });
  }

  try {
    const { token, password } = await req.json();
    if (!token || !password) return NextResponse.json({ error: 'Token y contraseña requeridos' }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });

    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      return NextResponse.json({ error: 'El enlace expiró o no es válido' }, { status: 400 });
    }

    if (payload.purpose !== 'reset-password' || !payload.email) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user || !user.activo) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    // Verificar que el token corresponde al hash actual — si ya se usó, el hash cambió y el token es inválido
    const hashSig = (user.passwordHash ?? '').slice(0, 12);
    if (payload.hashSig !== hashSig) {
      return NextResponse.json({ error: 'El enlace ya fue utilizado o expiró' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('reset-password error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
