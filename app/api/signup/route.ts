export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, nombre, rol } = body ?? {};
    if (!email || !password || !nombre) {
      return NextResponse.json({ error: 'Campos requeridos: email, password, nombre' }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, nombre, rol: rol || 'JEFE_TALLER' },
    });
    return NextResponse.json({ id: user.id, email: user.email, nombre: user.nombre }, { status: 201 });
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
