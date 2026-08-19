import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AppSidebar } from '@/components/app-sidebar';
import { MobileSidebar } from '@/components/mobile-sidebar';
import { GlobalSearch } from '@/components/global-search';
import { NotificationsBell } from '@/components/notifications-bell';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/auth/login');
  }
  const user = session.user as any;
  const sinTaller = !user?.tallerId && user?.role !== 'SUPER_ADMIN';
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div data-sidebar className="print:hidden hidden md:block">
        <AppSidebar user={user} />
      </div>
      {/* Mobile sidebar */}
      <div className="print:hidden md:hidden">
        <MobileSidebar user={user} />
      </div>
      <main className="flex-1 overflow-y-auto" data-main-content>
        {sinTaller && (
          <div className="print:hidden bg-amber-500/10 border-b border-amber-500/20 px-4 md:px-6 py-2 flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Tu cuenta no tiene un taller asignado. Contacta al Super Admin para que te vincule desde el Panel Admin.
          </div>
        )}
        <div className="print:hidden flex items-center justify-end px-4 md:px-6 pt-4 pb-0">
          <div className="md:hidden w-10" />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <ThemeToggleButton />
            <GlobalSearch />
            <NotificationsBell />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
