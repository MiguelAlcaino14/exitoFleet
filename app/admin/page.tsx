import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AdminClient from './admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/auth/login');
  if ((session.user as any)?.role !== 'SUPER_ADMIN') redirect('/dashboard');
  return <AdminClient />;
}
