import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AppSidebar } from '@/components/app-sidebar';
import { MobileSidebar } from '@/components/mobile-sidebar';
import { GlobalSearch } from '@/components/global-search';
import { NotificationsBell } from '@/components/notifications-bell';
import { ThemeToggleButton } from '@/components/theme-toggle-button';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/auth/login');
  }
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div data-sidebar className="print:hidden hidden md:block">
        <AppSidebar user={session.user as any} />
      </div>
      {/* Mobile sidebar */}
      <div className="print:hidden md:hidden">
        <MobileSidebar user={session.user as any} />
      </div>
      <main className="flex-1 overflow-y-auto" data-main-content>
        <div className="print:hidden flex items-center justify-end px-4 md:px-6 pt-4 pb-0">
          <div className="md:hidden w-10" /> {/* spacer for hamburger */}
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
