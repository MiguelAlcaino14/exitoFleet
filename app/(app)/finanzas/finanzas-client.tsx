'use client';

import { useEffect, useState, useMemo } from 'react';
import { DollarSign, TrendingUp, FileText, BarChart3, Plus, X, Receipt, CalendarDays, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function formatCLP(v: number) { return '$' + Math.round(v ?? 0).toLocaleString('es-CL'); }

export function FinanzasClient() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddFactura, setShowAddFactura] = useState(false);
  const [facturaForm, setFacturaForm] = useState({ numero: '', otId: '', montoNeto: '', observaciones: '' });
  const [saving, setSaving] = useState(false);
  const [facturas, setFacturas] = useState<any[]>([]);
  const [filtroFactura, setFiltroFactura] = useState('');
  const [expandedYear, setExpandedYear] = useState<number | null>(null);

  const facturasFiltradas = useMemo(() => {
    const q = filtroFactura.trim().toLowerCase();
    if (!q) return facturas;
    return (facturas ?? []).filter((f: any) =>
      (f?.numero ?? '').toLowerCase().includes(q) ||
      `ot-${String(f?.ordenTrabajo?.otNumero ?? '').padStart(4, '0')}`.toLowerCase().includes(q) ||
      String(f?.ordenTrabajo?.otNumero ?? '').includes(q) ||
      (f?.ordenTrabajo?.vehiculo?.cliente?.razonSocial ?? '').toLowerCase().includes(q)
    );
  }, [facturas, filtroFactura]);

  const cargar = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/finanzas').then(r => r.json()),
      fetch('/api/facturas').then(r => r.json()),
    ]).then(([fin, facs]) => {
      setData(fin);
      setFacturas(facs ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const crearFactura = async () => {
    if (!facturaForm.numero || !facturaForm.otId) { toast.error('Número de factura y OT son requeridos'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero: facturaForm.numero,
          otId: facturaForm.otId,
          montoNeto: parseFloat(facturaForm.montoNeto) || 0,
          observaciones: facturaForm.observaciones || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err?.error ?? 'Error al crear factura');
        setSaving(false);
        return;
      }
      toast.success('Factura registrada');
      setShowAddFactura(false);
      setFacturaForm({ numero: '', otId: '', montoNeto: '', observaciones: '' });
      cargar();
    } catch { toast.error('Error al crear factura'); }
    setSaving(false);
  };

  const porFacturar = data?.porFacturar ?? [];

  return (
    <div className="p-6 lg:p-10 max-w-[1600px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl lg:text-[32px] font-extrabold text-foreground tracking-tight">Finanzas</h1>
          <p className="text-muted-foreground text-sm mt-1">Control de facturación y resumen financiero</p>
        </div>
        <Button onClick={() => setShowAddFactura(!showAddFactura)} className="bg-primary hover:bg-primary/90 text-sm">
          <Plus className="w-4 h-4 mr-1" /> Registrar Factura
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { title: 'TOTAL FACTURADO', value: data?.totalFacturado ?? 0, sub: `${data?.cantidadFacturas ?? 0} facturas`, color: '#22c55e', icon: TrendingUp },
          { title: 'POR FACTURAR', value: data?.totalPorFacturar ?? 0, sub: `${data?.cantidadPorFacturar ?? 0} OTs`, color: '#F4B63D', icon: FileText },
          { title: 'MES ACTUAL', value: data?.resumenMensual?.[0]?.total ?? 0, sub: data?.resumenMensual?.[0]?.periodo ? `${data.resumenMensual[0].count} facturas` : 'Sin datos', color: '#3b82f6', icon: CalendarDays },
          { title: 'MARGEN PROMEDIO', value: 0, isMargin: true, color: '#8b5cf6', icon: BarChart3 },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card style={{ borderLeft: `3px solid ${kpi.color}` }}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold tracking-widest text-muted-foreground">{kpi.title}</span>
                    <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                  </div>
                  <div className="text-[26px] font-black text-foreground">
                    {loading ? <div className="h-7 w-28 bg-muted animate-pulse rounded mt-1" /> : kpi.isMargin ? '—' : formatCLP(kpi.value)}
                  </div>
                  <div className="text-muted-foreground text-[11px] mt-1">{loading ? <div className="h-3 w-16 bg-muted animate-pulse rounded mt-1" /> : kpi.sub}</div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Add Factura Form */}
      <AnimatePresence>
        {showAddFactura && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
            <Card className="border-primary/30">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Receipt className="w-4 h-4 text-primary" /> Registrar Nueva Factura</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">Nº FACTURA *</label>
                    <Input placeholder="Ej: F-00123" value={facturaForm.numero} onChange={(e) => setFacturaForm({ ...facturaForm, numero: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">OT ASOCIADA *</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={facturaForm.otId}
                      onChange={(e) => setFacturaForm({ ...facturaForm, otId: e.target.value })}
                    >
                      <option value="">Seleccionar OT...</option>
                      {porFacturar.map((ot: any) => (
                        <option key={ot.id} value={ot.id}>
                          OT-{String(ot.otNumero).padStart(4, '0')} — {ot.vehiculo?.patente} — {ot.vehiculo?.cliente?.razonSocial} — {formatCLP(ot.valorTotal)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">MONTO NETO (sin IVA)</label>
                    <Input type="number" placeholder="Monto neto" value={facturaForm.montoNeto} onChange={(e) => setFacturaForm({ ...facturaForm, montoNeto: e.target.value })} />
                    {facturaForm.montoNeto && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        IVA (19%): {formatCLP(Math.round(parseFloat(facturaForm.montoNeto) * 0.19))} — Total: {formatCLP(Math.round(parseFloat(facturaForm.montoNeto) * 1.19))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">OBSERVACIONES</label>
                    <Input placeholder="Opcional" value={facturaForm.observaciones} onChange={(e) => setFacturaForm({ ...facturaForm, observaciones: e.target.value })} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={crearFactura} disabled={saving} className="text-xs bg-primary hover:bg-primary/90">
                    <Receipt className="w-3 h-3 mr-1" /> {saving ? 'Guardando...' : 'Registrar Factura'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddFactura(false)} className="text-xs"><X className="w-3 h-3 mr-1" /> Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* OTs por facturar */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" /> OTs Pendientes de Facturación
            <Badge variant="secondary" className="text-[10px] ml-auto">{porFacturar.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/30 text-left">
                {['OT #', 'PATENTE', 'CLIENTE', 'VALOR TOTAL'].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [1,2,3].map(i => (
                <tr key={i} className="border-t border-border">
                  {[1,2,3,4].map(j => <td key={j} className="px-5 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}
                </tr>
              )) : porFacturar.length > 0 ? porFacturar.map((ot: any) => (
                <tr key={ot.id} className="border-t border-border hover:bg-secondary/10 transition cursor-pointer" onClick={() => window.location.href = `/ot/${ot.id}`}>
                  <td className="px-5 py-3 text-sm font-mono font-bold text-foreground">#{String(ot.otNumero).padStart(4, '0')}</td>
                  <td className="px-5 py-3 text-sm font-bold text-foreground">{ot.vehiculo?.patente}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{ot.vehiculo?.cliente?.razonSocial}</td>
                  <td className="px-5 py-3 text-sm font-bold text-primary">{formatCLP(ot.valorTotal ?? 0)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">No hay OTs pendientes de facturación</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Mensual */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" /> Facturación Mensual
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/30 text-left">
                <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">PERÍODO</th>
                <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">FACTURAS</th>
                <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">NETO</th>
                <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">IVA</th>
                <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {loading ? [1,2,3].map(i => (
                <tr key={i} className="border-t border-border">
                  {[1,2,3,4,5].map(j => <td key={j} className="px-5 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}
                </tr>
              )) : (data?.resumenMensual ?? []).length > 0 ? (data?.resumenMensual ?? []).map((m: any) => {
                const [y, mo] = m.periodo.split('-');
                return (
                  <tr key={m.periodo} className="border-t border-border">
                    <td className="px-5 py-3 text-sm font-medium text-foreground">{MESES[parseInt(mo) - 1]} {y}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{m.count}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{formatCLP(m.neto)}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{formatCLP(m.iva)}</td>
                    <td className="px-5 py-3 text-sm font-bold text-primary">{formatCLP(m.total)}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">Aún no hay facturas registradas</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Anual */}
      {(data?.resumenAnual ?? []).length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Facturación Anual
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/30 text-left">
                  <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">AÑO</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">FACTURAS</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">NETO</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">IVA</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {(data?.resumenAnual ?? []).map((a: any) => (
                  <tr key={a.anio} className="border-t border-border">
                    <td className="px-5 py-3 text-sm font-bold text-foreground">{a.anio}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{a.count}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{formatCLP(a.neto)}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{formatCLP(a.iva)}</td>
                    <td className="px-5 py-3 text-sm font-bold text-primary">{formatCLP(a.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Últimas Facturas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" /> Últimas Facturas Emitidas
            <Badge variant="secondary" className="text-[10px] ml-auto">{facturasFiltradas.length}</Badge>
          </CardTitle>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por N° de factura, OT o cliente..."
              className="pl-9 max-w-md"
              value={filtroFactura}
              onChange={(e: any) => setFiltroFactura(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/30 text-left">
                <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">Nº FACTURA</th>
                <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">OT</th>
                <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase hidden sm:table-cell">CLIENTE</th>
                <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">FECHA</th>
                <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">NETO</th>
                <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {facturasFiltradas.length > 0 ? facturasFiltradas.map((f: any) => (
                <tr key={f.id} className="border-t border-border hover:bg-secondary/10 transition cursor-pointer" onClick={() => window.location.href = `/ot/${f.ordenTrabajo?.id ?? f.otId}`}>
                  <td className="px-5 py-3 text-sm font-bold text-foreground">{f.numero}</td>
                  <td className="px-5 py-3 text-sm font-mono text-muted-foreground">OT-{String(f.ordenTrabajo?.otNumero ?? '').padStart(4, '0')}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground hidden sm:table-cell">{f.ordenTrabajo?.vehiculo?.cliente?.razonSocial ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{new Date(f.fechaEmision).toLocaleDateString('es-CL', { timeZone: 'UTC' })}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{formatCLP(f.montoNeto)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-primary">{formatCLP(f.montoTotal)}</td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">{filtroFactura ? 'No se encontraron facturas' : 'No hay facturas registradas'}</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
