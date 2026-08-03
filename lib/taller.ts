import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Devuelve { tallerId, isSuperAdmin, userId, session } del usuario autenticado.
 * Si es SUPER_ADMIN, tallerId puede ser null (ve todos los talleres).
 * Lanza si no hay sesión.
 */
export async function getTallerScope() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = session.user as any;
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  return {
    tallerId: user.tallerId as string | null,
    isSuperAdmin,
    userId: user.id as string,
    role: user.role as string,
    session,
  };
}

/**
 * Devuelve el filtro Prisma `where` para scopear por taller.
 * Si es SUPER_ADMIN devuelve {} (sin filtro = ve todo).
 * Si tiene tallerId devuelve { tallerId }.
 */
export function tallerWhere(scope: { tallerId: string | null; isSuperAdmin: boolean }) {
  if (scope.isSuperAdmin) return {};
  if (scope.tallerId) return { tallerId: scope.tallerId };
  // Usuario sin taller asignado y sin SUPER_ADMIN: no debe ver nada
  return { tallerId: '__NINGUNO__' };
}
