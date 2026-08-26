export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generatePresignedUploadUrl } from '@/lib/s3';

const ROLES_PUBLIC_UPLOAD = ['ADMIN', 'SUPER_ADMIN'];
const CONTENT_TYPES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { fileName, contentType, isPublic } = await req.json();
    if (!fileName || !contentType) return NextResponse.json({ error: 'fileName y contentType requeridos' }, { status: 400 });

    if (!CONTENT_TYPES_PERMITIDOS.includes(contentType)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
    }

    const role = (session.user as any)?.role ?? '';
    const publicAllowed = isPublic && ROLES_PUBLIC_UPLOAD.includes(role);

    const result = await generatePresignedUploadUrl(fileName, contentType, publicAllowed);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Presigned URL error:', err);
    return NextResponse.json({ error: 'Error generando URL' }, { status: 500 });
  }
}
