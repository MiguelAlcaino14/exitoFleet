'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, ChevronLeft, ChevronRight, Filter, FileText,
  Wrench, Truck, Clock, CheckCircle2, DollarSign, AlertCircle, X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const ESTADOS = [
  { id: 'TODAS', label: 'Todas', color: '#a1a1aa', icon: FileText },
  { id: 'POR_DIAGNOSTICAR', label: 'Por Diagnosticar', color: '#6366f1', icon: AlertCircle },
  { id: 'EN_COTIZACION', label: 'En Cotización', color: '#f97316', icon: DollarSign },
  { id: 'ESPERANDO_APROBACION', label: 'Esp. Aprobación', color: '#eab308', icon: Clock },
  { id: 'EN_TRABAJO', label: 'En Trabajo', color: '#22c55e', icon: Wrench },
  { id: 'POR_FACTURAR', label: 'Por Facturar', color: '#F4B63D', icon: DollarSign },
  { id: 'CERRADA', label: 'Cerrada', color: '#71717a', icon: CheckCircle2 },
];

const ESTADO_LABELS: Record<string, string> = {
  POR_DIAGNOSTICAR: 'Por Diagnosticar', EN_COTIZACION: 'En Cotización',
  ESPERANDO_APROBACION: 'Esp. Aprobación', EN_TRABAJO: 'En Trabajo',
  POR_FACTURAR: 'Por Facturar', CERRADA: 'Cerrada',
};

const ESTADO_COLORS: Record<string, string> = {
  POR_DIAGNOSTICAR: '#6366f1', EN_COTIZACION: '#f97316',
  ESPERANDO_APROBACION: '#eab308', EN_TRABAJO: '#22c55e',
  POR_FACTURAR: '#F4B63D', CERRADA: '#71717a',
};

export function HistorialClient() {
  const router = useRouter();
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<any[]>([]);

  // Filters
  const [buscar, setBuscar] = useState('');
  const [estado, setEstado] = useState('TODAS');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (estado !== 'TODAS') params.set('estado', estado);
      if (buscar) params.set('buscar', buscar);
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);

      const res = await fetch(`/api/ordenes/historial?${params.toString()}`);
      const data = await res.json();
      setOrdenes(data.ordenes ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setStats(data.stats ?? []);
    } catch {
      setOrdenes([]);
    } finally {
      setLoading(false);
    }
  }, [page, estado, buscar, desde, hasta]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [estado, buscar, desde, hasta]);

  const getStatCount = (est: string) => {
    const s = stats.find((s: any) => s.estado === est);
    return s?._count ?? 0;
  };

  const totalOTs = stats.reduce((acc: number, s: any) => acc + (s._count ?? 0), 0);
  const clearFilters = () => { setBuscar(''); setEstado('TODAS'); setDesde(''); setHasta(''); };
  const hasFilters = buscar || estado !== 'TODAS' || desde || hasta;

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  };

  const formatMoney = (v: number | null) => {
    if (!v) return '—';
    return `$${v.toLocaleString('es-CL')}`;
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight font-display">Historial de OTs</h1>
          <div className="w-10 h-1 bg-primary mt-2 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar OT, patente, cliente..."
              className="pl-9 w-[260px]"
              value={buscar}
              onChange={(e: any) => setBuscar(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className={showFilters ? 'border-primary text-primary' : ''}>
            <Filter className="w-4 h-4 mr-1" /> Filtros
          </Button>
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            {total} resultado{total !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        {ESTADOS.map((e) => {
          const count = e.id === 'TODAS' ? totalOTs : getStatCount(e.id);
          const isSelected = estado === e.id;
          const Icon = e.icon;
          return (
            <button
              key={e.id}
              onClick={() => setEstado(e.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-md'
                  : 'border-border bg-card hover:bg-secondary/20'
              }`}
            >
              <Icon className="w-4 h-4" style={{ color: e.color }} />
              <span className="text-lg font-bold text-foreground">{count}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{e.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
                    <Input
                      type="date"
                      value={desde}
                      onChange={(e: any) => setDesde(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
                    <Input
                      type="date"
                      value={hasta}
                      onChange={(e: any) => setHasta(e.target.value)}
                      className="w-[160px]"
                    />
                  </div>
                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4 mr-1" /> Limpiar filtros
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/30 text-left">
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">OT</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">PATENTE</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase hidden md:table-cell">CLIENTE</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase hidden sm:table-cell">MOTIVO</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase hidden lg:table-cell">INGRESO</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase hidden lg:table-cell">VALOR</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase text-center">ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenes.length > 0 ? ordenes.map((ot: any) => (
                    <tr
                      key={ot?.id}
                      className="border-t border-border hover:bg-secondary/10 transition cursor-pointer"
                      onClick={() => router.push(`/ot/${ot?.id}`)}
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-primary text-sm">
                          OT-{String(ot?.otNumero ?? '').padStart(4, '0')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold text-foreground text-sm">{ot?.vehiculo?.patente ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground hidden md:table-cell">
                        {ot?.vehiculo?.cliente?.razonSocial ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">
                        {ot?.motivoIngreso ?? '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">
                        {formatDate(ot?.fechaIngreso)}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-foreground hidden lg:table-cell">
                        {formatMoney(ot?.valorTotal)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider"
                          style={{
                            backgroundColor: `${ESTADO_COLORS[ot?.estado as string] ?? '#71717a'}20`,
                            color: ESTADO_COLORS[ot?.estado as string] ?? '#71717a',
                          }}
                        >
                          {ESTADO_LABELS[ot?.estado as string] ?? ot?.estado}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-muted-foreground">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No se encontraron órdenes de trabajo</p>
                        {hasFilters && (
                          <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                            Limpiar filtros
                          </Button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            Página {page} de {totalPages} · {total} OTs
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) { pageNum = i + 1; }
              else if (page <= 3) { pageNum = i + 1; }
              else if (page >= totalPages - 2) { pageNum = totalPages - 4 + i; }
              else { pageNum = page - 2 + i; }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="icon"
                  className={`h-8 w-8 text-xs ${page === pageNum ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
