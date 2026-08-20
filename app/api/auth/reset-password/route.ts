export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) return NextResponse.json({ error: 'Token y contraseña requeridos' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });

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

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('reset-password error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
