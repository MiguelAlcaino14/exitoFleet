'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Building2, Truck, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>({ clientes: [], vehiculos: [], ordenes: [] });
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const buscar = useCallback((q: string) => {
    if (q.length < 2) { setResults({ clientes: [], vehiculos: [], ordenes: [] }); return; }
    setLoading(true);
    fetch(`/api/buscar?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => { setResults(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (v: string) => {
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => buscar(v), 300);
  };

  const navegar = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery('');
  };

  const hasResults = (results?.clientes?.length ?? 0) + (results?.vehiculos?.length ?? 0) + (results?.ordenes?.length ?? 0) > 0;

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50 hover:bg-secondary text-muted-foreground text-sm transition-colors border border-border/50"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-background border border-border text-[10px] font-mono text-muted-foreground">Ctrl+K</kbd>
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setQuery(''); }} />
          <div ref={containerRef} className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Buscar patente, OT, cliente, RUT..."
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
              />
              {loading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              {query && (
                <button onClick={() => { setQuery(''); setResults({ clientes: [], vehiculos: [], ordenes: [] }); }}>
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>

            {/* Results */}
            {query.length >= 2 && (
              <div className="max-h-[50vh] overflow-y-auto p-2">
                {!hasResults && !loading && (
                  <div className="py-8 text-center text-sm text-muted-foreground">Sin resultados para &ldquo;{query}&rdquo;</div>
                )}

                {(results?.clientes?.length ?? 0) > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-[10px] font-black tracking-widest text-muted-foreground">CLIENTES</div>
                    {results.clientes.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => navegar(`/clientes/${c.id}`)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                      >
                        <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{c.razonSocial}</div>
                          <div className="text-xs text-muted-foreground">{c.rutEmpresa ?? 'Sin RUT'} · {c._count?.vehiculos ?? 0} vehículos</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {(results?.vehiculos?.length ?? 0) > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-[10px] font-black tracking-widest text-muted-foreground">VEHÍCULOS</div>
                    {results.vehiculos.map((v: any) => (
                      <button
                        key={v.id}
                        onClick={() => navegar(`/clientes/${v.clienteId}`)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                      >
                        <Truck className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{v.patente}</div>
                          <div className="text-xs text-muted-foreground">{[v.marca, v.modelo].filter(Boolean).join(' ') || 'Sin datos'} · {v.cliente?.razonSocial ?? ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {(results?.ordenes?.length ?? 0) > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1 text-[10px] font-black tracking-widest text-muted-foreground">ÓRDENES DE TRABAJO</div>
                    {results.ordenes.map((ot: any) => (
                      <button
                        key={ot.id}
                        onClick={() => navegar(`/ot/${ot.id}`)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
                      >
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">OT-{ot.otNumero}</div>
                          <div className="text-xs text-muted-foreground">{ot.vehiculo?.patente} · {ot.vehiculo?.cliente?.razonSocial ?? ''}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>ESC para cerrar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
