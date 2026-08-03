export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { SignJWT } from 'jose';

if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET no está configurado');
const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function POST(req: NextRequest) {
  try {
    const { rut, password } = await req.json();
    if (!rut || !password) return NextResponse.json({ error: 'RUT y contraseña requeridos' }, { status: 400 });

    const cliente = await prisma.cliente.findFirst({ where: { rutEmpresa: rut.trim() } });
    if (!cliente || !cliente.passwordHash) return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });

    const valid = await bcrypt.compare(password, cliente.passwordHash);
    if (!valid) return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });

    if (cliente.activo === false) {
      return NextResponse.json({ error: 'Esta cuenta fue desactivada. Contacte al taller para reactivar el acceso.' }, { status: 403 });
    }

    const token = await new SignJWT({ clienteId: cliente.id, razonSocial: cliente.razonSocial })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(SECRET);

    const res = NextResponse.json({ ok: true, razonSocial: cliente.razonSocial });
    res.cookies.set('portal_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600,
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch (err: any) {
    console.error('Portal login error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
