export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getFileUrl } from '@/lib/s3';
import { getTallerScope, tallerWhere } from '@/lib/taller';

const TIPOS_FOTO_VALIDOS = ['RECEPCION', 'DIAGNOSTICO', 'TRABAJO', 'ENTREGA'] as const;
const CONTENT_TYPES_VALIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    // M1: verificar que la OT pertenece al taller del usuario
    const orden = await prisma.ordenTrabajo.findFirst({
      where: { id: params.id, ...tallerWhere(scope) },
    });
    if (!orden) return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 });

    const body = await req.json();

    // M1: validar cloudStoragePath no vacío
    if (!body?.cloud_storage_path?.trim()) {
      return NextResponse.json({ error: 'cloud_storage_path requerido' }, { status: 400 });
    }

    // M1: validar tipoFoto contra enum
    const tipoFoto = body?.tipoFoto ?? 'RECEPCION';
    if (!TIPOS_FOTO_VALIDOS.includes(tipoFoto)) {
      return NextResponse.json({ error: 'tipoFoto inválido' }, { status: 400 });
    }

    const contentType = body?.contentType ?? 'image/jpeg';
    if (!CONTENT_TYPES_VALIDOS.includes(contentType)) {
      return NextResponse.json({ error: 'contentType no permitido' }, { status: 400 });
    }

    const foto = await prisma.fotografia.create({
      data: {
        otId: params.id,
        cloudStoragePath: body.cloud_storage_path.trim(),
        isPublic: body?.isPublic ?? false,
        tipoFoto,
        contentType,
        fileName: body?.fileName || null,
      },
    });
    return NextResponse.json(foto, { status: 201 });
  } catch (err: any) {
    console.error('Foto POST error:', err);
    return NextResponse.json({ error: 'Error al guardar foto' }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const orden = await prisma.ordenTrabajo.findFirst({
      where: { id: params.id, ...tallerWhere(scope) },
    });
    if (!orden) return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 });

    const fotos = await prisma.fotografia.findMany({
      where: { otId: params.id },
      orderBy: { fechaSubida: 'desc' },
    });

    const fotosConUrl = await Promise.all(
      fotos.map(async (f) => {
        const url = await getFileUrl(f.cloudStoragePath, f.contentType ?? 'image/jpeg', f.isPublic ?? false);
        return { ...f, url };
      })
    );
    return NextResponse.json(fotosConUrl);
  } catch (err: any) {
    console.error('Fotos GET error:', err);
    return NextResponse.json({ error: 'Error al cargar fotos' }, { status: 500 });
  }
}
