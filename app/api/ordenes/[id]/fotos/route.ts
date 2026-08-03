export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getFileUrl } from '@/lib/s3';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const foto = await prisma.fotografia.create({
      data: {
        otId: params?.id,
        cloudStoragePath: body?.cloud_storage_path,
        isPublic: body?.isPublic ?? false,
        tipoFoto: body?.tipoFoto ?? 'RECEPCION',
        contentType: body?.contentType ?? 'image/jpeg',
        fileName: body?.fileName || null,
      },
    });
    return NextResponse.json(foto, { status: 201 });
  } catch (err: any) {
    console.error('Foto POST error:', err);
    return NextResponse.json({ error: 'Error al guardar foto' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const fotos = await prisma.fotografia.findMany({ where: { otId: params?.id }, orderBy: { fechaSubida: 'desc' } });
    const fotosConUrl = await Promise.all(
      (fotos ?? []).map(async (f: any) => {
        const url = await getFileUrl(f?.cloudStoragePath, f?.contentType ?? 'image/jpeg', f?.isPublic ?? false);
        return { ...f, url };
      })
    );
    return NextResponse.json(fotosConUrl);
  } catch (err: any) {
    console.error('Fotos GET error:', err);
    return NextResponse.json({ error: 'Error al cargar fotos' }, { status: 500 });
  }
}
