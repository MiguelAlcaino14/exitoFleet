'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const NIVEL_DOT: Record<string, string> = {
  critico:     'bg-red-500',
  advertencia: 'bg-orange-400',
  info:        'bg-blue-400',
};

function alertaKey(a: any): string {
  return `${a.tipo}_${a.otId || a.clienteId || a.tallerId || a.descripcion}`;
}

function loadVistas(userId: string): Set<string> {
  try {
    const saved = localStorage.getItem(`notif_vistas_${userId}`);
    return new Set(saved ? JSON.parse(saved) : []);
  } catch { return new Set(); }
}

function saveVistas(userId: string, vistas: Set<string>) {
  try {
    localStorage.setItem(`notif_vistas_${userId}`, JSON.stringify([...vistas]));
  } catch {}
}

interface Props {
  userId: string;
}

export function NotificationsBell({ userId }: Props) {
  const router = useRouter();
  const [alertas, setAlertas] = useState<any[]>([]);
  const [vistas, setVistas] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVistas(loadVistas(userId));
  }, [userId]);

  useEffect(() => {
    const cargar = () => {
      fetch('/api/alertas')
        .then(r => r.json())
        .then(d => setAlertas(d?.alertas ?? []))
        .catch(() => {});
    };
    cargar();
    const interval = setInterval(cargar, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const noVistas = alertas.filter(a => !vistas.has(alertaKey(a)));
  const criticas = noVistas.filter(a => a.nivel === 'critico').length;

  const handleToggle = () => {
    if (!open) {
      const nuevasVistas = new Set([...vistas, ...alertas.map(alertaKey)]);
      setVistas(nuevasVistas);
      saveVistas(userId, nuevasVistas);
    }
    setOpen(v => !v);
  };

  const handleClick = (a: any) => {
    if (a.otId) router.push(`/ot/${a.otId}`);
    else if (a.tipo === 'por_facturar') router.push('/finanzas');
    else if (a.clienteId) router.push(`/clientes/${a.clienteId}`);
    else if (a.tallerId) router.push('/admin');
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-border/50"
      >
        <Bell className="w-4 h-4" />
        {noVistas.length > 0 && (
          <span className={cn(
            'absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white',
            criticas > 0 ? 'bg-red-500' : 'bg-primary'
          )}>
            {noVistas.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-[380px] bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">Notificaciones</span>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-secondary transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/50">
            {alertas.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Sin notificaciones pendientes ✔
              </div>
            ) : (
              alertas.map((a: any, i: number) => {
                const isNueva = !vistas.has(alertaKey(a));
                return (
                  <button
                    key={i}
                    onClick={() => handleClick(a)}
                    className={cn(
                      'w-full px-4 py-3.5 flex items-start gap-3 text-left transition-colors hover:bg-secondary/30',
                      isNueva && 'bg-primary/5'
                    )}
                  >
                    {/* Punto de color */}
                    <span className={cn(
                      'mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0',
                      NIVEL_DOT[a.nivel] ?? 'bg-muted-foreground'
                    )} />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-snug">{a.titulo ?? a.tipo}</p>
                      <p className="text-xs text-muted-foreground italic mt-0.5 leading-relaxed">{a.descripcion ?? a.mensaje}</p>
                      {a.tiempo && (
                        <span className="inline-block mt-1.5 text-[10px] font-mono bg-secondary text-muted-foreground rounded px-1.5 py-0.5">
                          {a.tiempo}
                        </span>
                      )}
                    </div>

                    {isNueva && (
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
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
