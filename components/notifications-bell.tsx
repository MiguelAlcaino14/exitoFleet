'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, AlertTriangle, Clock, FileText, X, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';

const NIVEL_COLORS: Record<string, string> = {
  critico: 'text-red-400',
  advertencia: 'text-yellow-400',
  info: 'text-blue-400',
};

const TIPO_ICONS: Record<string, any> = {
  sin_aprobar: AlertTriangle,
  sin_diagnostico: Clock,
  trabajo_prolongado: Clock,
  por_facturar: FileText,
  cuenta_desactivada: UserX,
};

export function NotificationsBell() {
  const router = useRouter();
  const [alertas, setAlertas] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cargar = () => {
      fetch('/api/alertas')
        .then(r => r.json())
        .then(d => setAlertas(d?.alertas ?? []))
        .catch(() => {});
    };
    cargar();
    const interval = setInterval(cargar, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const criticas = alertas.filter(a => a.nivel === 'critico').length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-border/50"
      >
        <Bell className="w-4 h-4" />
        {alertas.length > 0 && (
          <span className={cn(
            'absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white',
            criticas > 0 ? 'bg-red-500' : 'bg-primary'
          )}>
            {alertas.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-[340px] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Alertas</span>
            <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto">
            {alertas.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Sin alertas pendientes ✔️</div>
            ) : (
              alertas.map((a: any, i: number) => {
                const Icon = TIPO_ICONS[a.tipo] ?? Bell;
                return (
                  <button
                    key={i}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-secondary/30 transition-colors text-left border-b border-border/50 last:border-0"
                    onClick={() => {
                      if (a.otId) router.push(`/ot/${a.otId}`);
                      else if (a.tipo === 'por_facturar') router.push('/finanzas');
                      else if (a.clienteId) router.push(`/clientes/${a.clienteId}`);
                      setOpen(false);
                    }}
                  >
                    <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', NIVEL_COLORS[a.nivel] ?? 'text-muted-foreground')} />
                    <div className="min-w-0">
                      <div className="text-sm text-foreground">{a.mensaje}</div>
                      {a.cliente && <div className="text-xs text-muted-foreground mt-0.5">{a.cliente}</div>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
