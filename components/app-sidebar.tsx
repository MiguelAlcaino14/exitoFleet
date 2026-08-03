'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LayoutDashboard, Plus, Columns3, Users, LogOut, ChevronLeft, ChevronRight, Settings, DollarSign, ClipboardList, Truck, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
  user: { name?: string | null; email?: string | null; role?: string };
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

export function AppSidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const role = user?.role ?? 'JEFE_TALLER';

  const menuItems = allMenuItems.filter(item => item.roles.includes(role));

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn(
        'flex flex-col border-r border-border bg-card transition-all duration-300 relative h-screen',
        collapsed ? 'w-[72px]' : 'w-[220px]'
      )}>
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            {!collapsed ? (
              <div>
                <div className="text-foreground font-black text-xl tracking-[2px]">
                  <span className="text-primary">ÉXITO</span>
                </div>
                <div className="text-muted-foreground text-[9px] tracking-[2px] uppercase font-bold mt-0.5">Fleet Management</div>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-black text-sm">É</span>
              </div>
            )}
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground z-10 transition-colors hidden md:flex"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Menu */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems?.map((item: any) => {
            const Icon = item?.icon;
            const active = isActive(item?.href);
            const btn = (
              <Link
                key={item?.id}
                href={item?.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-[13px] font-medium',
                  item?.primary && !active && 'bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold',
                  active && !item?.primary && 'bg-secondary text-foreground border border-border',
                  active && item?.primary && 'bg-primary text-primary-foreground font-extrabold',
                  !active && !item?.primary && 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                )}
              >
                {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
                {!collapsed && <span>{item?.label}</span>}
              </Link>
            );
            if (collapsed) {
              return (
                <Tooltip key={item?.id}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">{item?.label}</TooltipContent>
                </Tooltip>
              );
            }
            return <div key={item?.id}>{btn}</div>;
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-border">
          <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
              {(user?.name ?? 'U')?.[0]?.toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-foreground text-sm font-semibold truncate">{user?.name ?? 'Usuario'}</div>
                <div className="text-muted-foreground text-xs truncate">{ROLE_LABELS[role] ?? role}</div>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            className="w-full mt-2 text-muted-foreground hover:text-destructive"
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Cerrar Sesión</span>}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
