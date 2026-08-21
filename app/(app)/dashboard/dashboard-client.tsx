'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { DollarSign, Wrench, ClipboardList, AlertTriangle, Clock, TrendingUp, Activity, CheckCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { motion } from 'framer-motion';

function formatCLP(value: number): string {
  return '$' + (value ?? 0).toLocaleString('es-CL');
}

function AnimatedNumber({ value, prefix = '' }: { value: number; prefix?: string }) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    const duration = 1200;
    const start = Date.now();
    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.floor((value) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);
  if (prefix === '$') return <span>{formatCLP(displayed)}</span>;
  return <span>{prefix}{displayed.toLocaleString('es-CL')}</span>;
}

export function DashboardClient() {
  const { data: session } = useSession() || {};
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const kpis = data?.kpis ?? {};
  const alertas = data?.alertas ?? [];
  const ultimasOTs = data?.ultimasOTs ?? [];

  const kpiCards = [
    { title: 'OTs ABIERTAS', value: kpis?.diagnosticosPendientes?.count ?? 0, sub: 'En diagnóstico', accent: '#3b82f6', icon: ClipboardList },
    { title: 'POR APROBAR', value: kpis?.esperandoAprobacion?.count ?? 0, sub: 'Requiere llamado', accent: '#f97316', icon: Clock },
    { title: 'EN TRABAJO', value: kpis?.enTrabajo?.count ?? 0, sub: 'Taller operativo', accent: '#22c55e', icon: Wrench },
    { title: 'PEND. FACTURAR', value: kpis?.porFacturar?.valor ?? 0, sub: `${kpis?.porFacturar?.count ?? 0} OTs listas`, accent: '#F4B63D', icon: DollarSign, prefix: '$' },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-[1600px]">
      {/* Header */}
      <div className="mb-10 flex flex-col lg:flex-row justify-between items-start lg:items-end">
        <div>
          <h1 className="text-2xl lg:text-[32px] font-extrabold text-foreground tracking-tight">
            Dashboard Operativo
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Bienvenido, {session?.user?.name ?? 'Administrador'} · Resumen de órdenes de trabajo
          </p>
        </div>
        <div className="text-right mt-4 lg:mt-0">
          <span className="text-[10px] font-bold tracking-widest text-muted-foreground">ESTADO DEL SISTEMA</span>
          <div className="text-emerald-500 text-xs font-bold mt-1 flex items-center gap-1.5 justify-end">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ONLINE
          </div>
        </div>
      </div>

      {/* KPIs sobrios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="hover:shadow-lg transition-shadow" style={{ borderLeft: `3px solid ${kpi.accent}` }}>
                <CardContent className="p-5">
                  <div className="text-[10px] font-extrabold tracking-widest text-muted-foreground mb-3">{kpi.title}</div>
                  <div className="text-[28px] font-black text-foreground leading-none">
                    {loading ? <div className="h-8 w-24 bg-muted animate-pulse rounded mt-1" /> : <AnimatedNumber value={kpi.value} prefix={kpi.prefix ?? ''} />}
                  </div>
                  <div className="text-muted-foreground text-[11px] mt-1.5">{kpi.sub}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Alertas prioritarias */}
      {(alertas?.length ?? 0) > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-extrabold tracking-widest text-muted-foreground uppercase">Alertas Prioritarias</h2>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(alertas ?? []).slice(0, 4).map((alerta: any, i: number) => (
              <motion.div key={`${alerta?.id}-${i}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Link href={`/ot/${alerta?.id}`}>
                  <div className={`p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer flex items-center gap-4 ${
                    alerta?.tipo === 'aprobacion'
                      ? 'border-red-500/30 bg-red-500/5'
                      : 'border-yellow-500/30 bg-yellow-500/5'
                  }`}>
                    <span className="text-2xl">{alerta?.tipo === 'aprobacion' ? '🔴' : '🟠'}</span>
                    <div>
                      <div className={`font-extrabold text-xs ${alerta?.tipo === 'aprobacion' ? 'text-red-500' : 'text-yellow-600'}`}>
                        {alerta?.tipo === 'aprobacion' ? `CRÍTICO · +${alerta?.dias} DÍAS SIN APROBACIÓN` : 'ATENCIÓN · DIAGNÓSTICO PENDIENTE'}
                      </div>
                      <div className="text-sm text-foreground mt-1">
                        Camión <span className="font-extrabold">{alerta?.patente}</span> · {alerta?.cliente}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla sobria de actividad + Resumen estados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla actividad */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold">Actividad de Taller</CardTitle>
                <Link href="/kanban" className="text-primary text-xs font-bold hover:underline flex items-center gap-1">
                  VER FLUJO COMPLETO <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/30 text-left">
                    {['OT #', 'PATENTE', 'VEHÍCULO', 'CLIENTE', 'ESTADO'].map((h) => (
                      <th key={h} className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? [1,2,3,4,5].map(i => (
                    <tr key={i} className="border-t border-border">
                      {[1,2,3,4,5].map(j => <td key={j} className="px-5 py-3.5"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}
                    </tr>
                  )) : (ultimasOTs ?? []).length > 0 ? (ultimasOTs ?? []).map((row: any, idx: number) => {
                    const estadoColor = {
                      POR_DIAGNOSTICAR: '#6366f1', EN_COTIZACION: '#f97316',
                      ESPERANDO_APROBACION: '#eab308', EN_TRABAJO: '#22c55e',
                      POR_FACTURAR: '#F4B63D', CERRADA: '#71717a',
                    }[row?.estado as string] ?? '#71717a';
                    const estadoLabel = {
                      POR_DIAGNOSTICAR: 'Diagnóstico', EN_COTIZACION: 'Cotización',
                      ESPERANDO_APROBACION: 'Esp. Aprobación', EN_TRABAJO: 'En Trabajo',
                      POR_FACTURAR: 'Por Facturar', CERRADA: 'Cerrada',
                    }[row?.estado as string] ?? row?.estado;
                    return (
                      <tr key={row?.id ?? idx} className="border-t border-border hover:bg-secondary/10 transition cursor-pointer" onClick={() => window.location.href = `/ot/${row?.id}`}>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">#{String(row?.otNumero).padStart(4, '0')}</td>
                        <td className="px-5 py-3.5 text-sm font-bold text-foreground">{row?.vehiculo?.patente}</td>
                        <td className="px-5 py-3.5 text-sm text-foreground">{[row?.vehiculo?.marca, row?.vehiculo?.modelo].filter(Boolean).join(' ')}</td>
                        <td className="px-5 py-3.5 text-sm text-muted-foreground">{row?.vehiculo?.cliente?.razonSocial}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: estadoColor }} />
                            <span className="text-[11px] font-bold" style={{ color: estadoColor }}>{String(estadoLabel).toUpperCase()}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">Sin órdenes de trabajo aún</td></tr>
                  )}
                </tbody>
              </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumen estados */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Resumen de Estados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Por Diagnosticar', count: kpis?.diagnosticosPendientes?.count ?? 0, color: 'bg-indigo-500' },
                { label: 'En Cotización', count: kpis?.enCotizacion?.count ?? 0, color: 'bg-orange-500' },
                { label: 'Esp. Aprobación', count: kpis?.esperandoAprobacion?.count ?? 0, color: 'bg-yellow-500' },
                { label: 'En Trabajo', count: kpis?.enTrabajo?.count ?? 0, color: 'bg-emerald-500' },
                { label: 'Por Facturar', count: kpis?.porFacturar?.count ?? 0, color: 'bg-amber-500' },
                { label: 'Cerradas', count: kpis?.cerradas?.count ?? 0, color: 'bg-zinc-500' },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                    <span className="text-sm text-foreground">{s.label}</span>
                  </div>
                  {loading ? <div className="h-4 w-6 bg-muted animate-pulse rounded" /> : <span className="text-sm font-mono font-bold text-foreground">{s.count}</span>}
                </div>
              ))}
              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> OTs Activas
                  </span>
                  {loading ? <div className="h-5 w-8 bg-muted animate-pulse rounded" /> : <span className="text-lg font-mono font-bold text-primary">{data?.totalOTsActivas ?? 0}</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
