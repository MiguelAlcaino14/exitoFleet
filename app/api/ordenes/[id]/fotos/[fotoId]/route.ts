export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { deleteFile } from '@/lib/s3';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; fotoId: string } }) {
  const scope = await getTallerScope();
  if (!scope) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const orden = await prisma.ordenTrabajo.findFirst({
      where: { id: params.id, ...tallerWhere(scope) },
    });
    if (!orden) return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 });

    const foto = await prisma.fotografia.findFirst({
      where: { id: params.fotoId, otId: params.id },
    });
    if (!foto) return NextResponse.json({ error: 'Foto no encontrada' }, { status: 404 });

    await deleteFile(foto.cloudStoragePath);
    await prisma.fotografia.delete({ where: { id: params.fotoId } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Foto DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar foto' }, { status: 500 });
  }
}
