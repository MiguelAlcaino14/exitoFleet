'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Truck, Loader2, FileText, Clock, Wrench, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import Link from 'next/link';

const ESTADOS: Record<string, { label: string; color: string }> = {
  POR_DIAGNOSTICAR: { label: 'Por Diagnosticar', color: 'bg-indigo-500/20 text-indigo-400' },
  EN_COTIZACION: { label: 'En Cotización', color: 'bg-orange-500/20 text-orange-400' },
  ESPERANDO_APROBACION: { label: 'Esp. Aprobación', color: 'bg-yellow-500/20 text-yellow-400' },
  EN_TRABAJO: { label: 'En Trabajo', color: 'bg-emerald-500/20 text-emerald-400' },
  POR_FACTURAR: { label: 'Por Facturar', color: 'bg-[#F4B63D]/20 text-[#F4B63D]' },
  CERRADA: { label: 'Cerrada', color: 'bg-zinc-500/20 text-zinc-400' },
};

const GRUPOS = [
  { key: 'REPUESTO', label: 'REPUESTOS' },
  { key: 'INSUMO', label: 'INSUMOS' },
  { key: 'SERVICIO', label: 'SERVICIOS' },
  { key: 'MANO_DE_OBRA', label: 'MANO DE OBRA' },
  { key: 'DESCUENTO', label: 'DESCUENTOS' },
];

function formatCLP(v: number) { return '$' + Math.round(v ?? 0).toLocaleString('es-CL'); }
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function formatDateTime(d: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', timeZone: 'UTC' }) + ', ' +
    dt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

export default function PortalOTDetalle() {
  const [ot, setOt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    fetch(`/api/portal/ot/${params.id}`)
      .then(r => { if (r.status === 401) { router.push('/portal/login'); return null; } return r.json(); })
      .then(d => { if (d && !d.error) setOt(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id, router]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#F4B63D]" />
    </div>
  );

  if (!ot) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
      <p>OT no encontrada</p>
    </div>
  );

  const est = ESTADOS[ot.estado] ?? { label: ot.estado, color: 'bg-zinc-500/20 text-zinc-400' };
  const items = ot.itemsValorizacion ?? [];
  const eventos = ot.eventosTimeline ?? [];

  const totalGrupo = (tipo: string) => items.filter((i: any) => i.tipo === tipo)
    .reduce((s: number, i: any) => s + Math.round((i.precioVenta || 0) * (i.cantidad || 1)), 0);
  const totalGeneral = GRUPOS.reduce((s, g) => {
    const t = totalGrupo(g.key);
    return g.key === 'DESCUENTO' ? s - t : s + t;
  }, 0);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/portal" className="text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold">OT-{String(ot.otNumero).padStart(4, '0')}</h1>
              <Badge className={`text-xs ${est.color}`}>{est.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{ot.vehiculo?.patente} — {[ot.vehiculo?.marca, ot.vehiculo?.modelo].filter(Boolean).join(' ')}</p>
          </div>
          <ThemeToggleButton />
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-8 space-y-6">
            {/* Diagnóstico */}
            {ot.diagnosticoMecanico && (
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <h3 className="text-[10px] font-black tracking-widest text-[#F4B63D] mb-2">DIAGNÓSTICO TÉCNICO</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{ot.diagnosticoMecanico}</p>
                </CardContent>
              </Card>
            )}

            {/* Valorización */}
            {items.length > 0 && (
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <h3 className="text-[10px] font-black tracking-widest text-[#F4B63D] mb-4">VALORIZACIÓN</h3>
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-[1fr_60px_100px_100px] bg-muted px-3 py-2 border-b border-border">
                      {['DESCRIPCIÓN', 'CTDAD', '$ VENTA', '$ TOTAL'].map((h, i) => (
                        <div key={i} className={`text-[10px] font-black tracking-wider text-muted-foreground ${i >= 2 ? 'text-right' : ''}`}>{h}</div>
                      ))}
                    </div>
                    {GRUPOS.map(grupo => {
                      const lineas = items.filter((i: any) => i.tipo === grupo.key);
                      if (lineas.length === 0) return null;
                      const subtotal = totalGrupo(grupo.key);
                      return (
                        <div key={grupo.key}>
                          <div className="px-3 py-2 bg-muted/50 border-b border-t border-border">
                            <span className="text-[11px] font-black tracking-widest text-[#F4B63D]">{grupo.label}</span>
                          </div>
                          {lineas.map((item: any, idx: number) => {
                            const totalItem = Math.round((item.precioVenta || 0) * (item.cantidad || 1));
                            const esDesc = item.tipo === 'DESCUENTO';
                            return (
                              <div key={item.id} className={`grid grid-cols-[1fr_60px_100px_100px] px-3 py-2 border-b border-border ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`}>
                                <span className="text-sm truncate">{item.descripcion}</span>
                                <span className="text-sm text-center text-muted-foreground">{item.cantidad}</span>
                                <span className="text-sm text-right">{formatCLP(item.precioVenta)}</span>
                                <span className={`text-sm text-right font-semibold ${esDesc ? 'text-red-400' : ''}`}>
                                  {esDesc ? `-${formatCLP(Math.abs(totalItem))}` : formatCLP(totalItem)}
                                </span>
                              </div>
                            );
                          })}
                          <div className="grid grid-cols-[1fr_60px_100px_100px] px-3 py-2 bg-muted/50 border-b-2 border-border">
                            <span className="text-[10px] font-bold tracking-wider text-muted-foreground">SUBTOTAL {grupo.label}</span>
                            <span /><span />
                            <span className="text-right font-bold text-sm text-[#F4B63D]">{formatCLP(subtotal)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Totales */}
                  <div className="mt-4 bg-[#F4B63D] rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-[#121212]">TOTAL NETO</span>
                      <span className="text-2xl font-black text-[#121212]">{formatCLP(totalGeneral)}</span>
                    </div>
                    <div className="flex justify-between text-xs mt-2 text-[#121212]/70">
                      <span>IVA (19%):</span>
                      <span className="font-bold">{formatCLP(totalGeneral * 0.19)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-black mt-1 text-[#121212]">
                      <span>TOTAL c/IVA:</span>
                      <span>{formatCLP(totalGeneral * 1.19)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Historial de estados */}
            {eventos.length > 0 && (
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <h3 className="text-[10px] font-black tracking-widest text-[#F4B63D] mb-4">HISTORIAL</h3>
                  <div className="space-y-4 relative before:content-[''] before:absolute before:left-[7px] before:top-0 before:w-[1px] before:h-full before:bg-border">
                    {eventos.map((ev: any) => (
                      <div key={ev.id} className="relative pl-8">
                        <div className="absolute left-0 w-4 h-4 rounded-full bg-card border border-muted-foreground/30 flex items-center justify-center z-10 mt-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${ev.tipoEvento === 'estado' ? 'bg-[#F4B63D]' : 'bg-muted-foreground/50'}`} />
                        </div>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-xs font-black tracking-widest uppercase">{ev.titulo}</h4>
                          <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap ml-4">{formatDateTime(ev.createdAt)}</span>
                        </div>
                        {ev.descripcion && <p className="text-sm text-muted-foreground leading-relaxed">{ev.descripcion}</p>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <h3 className="text-[10px] font-black text-[#F4B63D] tracking-[2px] mb-4">DATOS DE LA OT</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold mb-0.5">ESTADO ACTUAL</label>
                    <Badge className={`text-xs ${est.color}`}>{est.label}</Badge>
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold mb-0.5">VEHÍCULO</label>
                    <span className="text-sm font-bold">{ot.vehiculo?.patente}</span>
                    <p className="text-xs text-muted-foreground">{[ot.vehiculo?.marca, ot.vehiculo?.modelo].filter(Boolean).join(' ')}</p>
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold mb-0.5">FECHA INGRESO</label>
                    <span className="text-sm font-bold">{formatDate(ot.fechaIngreso)}</span>
                  </div>
                  {ot.fechaTermino && (
                    <div>
                      <label className="block text-[10px] text-muted-foreground font-bold mb-0.5">FECHA TÉRMINO</label>
                      <span className="text-sm font-bold">{formatDate(ot.fechaTermino)}</span>
                    </div>
                  )}
                  {ot.mecanico && (
                    <div>
                      <label className="block text-[10px] text-muted-foreground font-bold mb-0.5">MECÁNICO</label>
                      <span className="text-sm font-bold text-[#F4B63D] uppercase">{ot.mecanico.nombre}</span>
                    </div>
                  )}
                  {ot.motivoIngreso && (
                    <div>
                      <label className="block text-[10px] text-muted-foreground font-bold mb-0.5">MOTIVO</label>
                      <span className="text-sm">{ot.motivoIngreso}</span>
                    </div>
                  )}
                  {ot.observaciones && (
                    <div>
                      <label className="block text-[10px] text-muted-foreground font-bold mb-0.5">OBSERVACIONES</label>
                      <span className="text-sm text-muted-foreground">{ot.observaciones}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Total card */}
            {items.length > 0 && (
              <div className="bg-[#F4B63D] rounded-lg p-5">
                <div className="text-[10px] font-black opacity-60 tracking-widest mb-1 text-[#121212]">TOTAL NETO</div>
                <div className="text-3xl font-black text-[#121212]">{formatCLP(totalGeneral)}</div>
                <div className="border-t border-[#121212]/20 mt-3 pt-3 space-y-1">
                  <div className="flex justify-between text-xs text-[#121212]/70">
                    <span>IVA (19%):</span>
                    <span className="font-bold">{formatCLP(totalGeneral * 0.19)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-[#121212]">
                    <span>TOTAL c/IVA:</span>
                    <span>{formatCLP(totalGeneral * 1.19)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
