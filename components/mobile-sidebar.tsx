'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Menu, X, LayoutDashboard, Plus, Columns3, Users, LogOut, Settings, DollarSign, ClipboardList, Truck, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MobileSidebarProps {
  user: { name?: string | null; email?: string | null; role?: string };
  logoUrl?: string | null;
  tallerNombre?: string | null;
}

const allMenuItems = [
  { id: 'nueva-ot', href: '/ot/nueva', icon: Plus, label: 'Nueva OT', primary: true, roles: ['ADMIN', 'JEFE_TALLER', 'RECEPCION', 'SUPER_ADMIN'] },
  { id: 'dashboard', href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'JEFE_TALLER', 'RECEPCION', 'FINANZAS', 'SUPER_ADMIN'] },
  { id: 'kanban', href: '/kanban', icon: Columns3, label: 'Tablero Kanban', roles: ['ADMIN', 'JEFE_TALLER', 'RECEPCION', 'SUPER_ADMIN'] },
  { id: 'historial', href: '/historial', icon: ClipboardList, label: 'Historial OTs', roles: ['ADMIN', 'JEFE_TALLER', 'RECEPCION', 'FINANZAS', 'SUPER_ADMIN'] },
  { id: 'vehiculos', href: '/vehiculos', icon: Truck, label: 'Vehículos', roles: ['ADMIN', 'JEFE_TALLER', 'RECEPCION', 'SUPER_ADMIN'] },
  { id: 'clientes', href: '/clientes', icon: Users, label: 'Clientes', roles: ['ADMIN', 'JEFE_TALLER', 'RECEPCION', 'FINANZAS', 'SUPER_ADMIN'] },
  { id: 'finanzas', href: '/finanzas', icon: DollarSign, label: 'Finanzas', roles: ['ADMIN', 'FINANZAS', 'SUPER_ADMIN'] },
  { id: 'config', href: '/configuracion', icon: Settings, label: 'Configuración', roles: ['ADMIN', 'SUPER_ADMIN'] },
  { id: 'admin', href: '/admin', icon: ShieldCheck, label: 'Panel Admin', roles: ['SUPER_ADMIN'] },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  JEFE_TALLER: 'Jefe de Taller',
  RECEPCION: 'Recepción',
  FINANZAS: 'Finanzas',
  SUPER_ADMIN: 'Super Admin',
};

export function MobileSidebar({ user, logoUrl, tallerNombre }: MobileSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const role = user?.role ?? 'JEFE_TALLER';
  const menuItems = allMenuItems.filter(item => item.roles.includes(role));

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center text-foreground shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 z-50 w-[260px] bg-card border-r border-border flex flex-col md:hidden">
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              {logoUrl ? (
                <Image src={logoUrl} alt={tallerNombre ?? 'Logo'} width={0} height={0} sizes="160px" style={{ width: 'auto', height: 'auto', maxWidth: '140px', maxHeight: '48px' }} className="object-contain" priority unoptimized />
              ) : (
                <>
                  <Image src="/logo.png" alt="D Motor" width={0} height={0} sizes="160px" style={{ width: 'auto', height: 'auto', maxWidth: '140px', maxHeight: '48px' }} className="object-contain dark:hidden" priority />
                  <Image src="/logo-dark.png" alt="D Motor" width={0} height={0} sizes="160px" style={{ width: 'auto', height: 'auto', maxWidth: '140px', maxHeight: '48px' }} className="object-contain hidden dark:block" priority />
                </>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu */}
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {menuItems.map((item: any) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-[13px] font-medium',
                      item.primary && !active && 'bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold',
                      active && !item.primary && 'bg-secondary text-foreground border border-border',
                      active && item.primary && 'bg-primary text-primary-foreground font-extrabold',
                      !active && !item.primary && 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User */}
            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                  {(user?.name ?? 'U')?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground text-sm font-semibold truncate">{user?.name ?? 'Usuario'}</div>
                  <div className="text-muted-foreground text-xs truncate">{ROLE_LABELS[role] ?? role}</div>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full bg-[hsl(217,74%,45%)] text-white hover:bg-[hsl(217,74%,45%)]/90"
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
              >
                <LogOut className="w-4 h-4" />
                <span className="ml-2">Cerrar sesión</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
