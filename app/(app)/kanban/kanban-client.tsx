'use client';

import { useEffect, useState } from 'react';
import { Search, Eye, ChevronRight, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';

const ESTADOS = [
  { id: 'POR_DIAGNOSTICAR', label: 'Por Diagnosticar', color: '#6366f1', icon: '🔍' },
  { id: 'EN_COTIZACION', label: 'En Cotización', color: '#f97316', icon: '📋' },
  { id: 'ESPERANDO_APROBACION', label: 'Esp. Aprobación', color: '#eab308', icon: '⏳' },
  { id: 'EN_TRABAJO', label: 'En Trabajo', color: '#22c55e', icon: '🛠️' },
  { id: 'POR_FACTURAR', label: 'Por Facturar', color: '#F4B63D', icon: '💰' },
];

function formatCLP(v: number) {
  return '$' + (v ?? 0).toLocaleString('es-CL');
}

function diasDesde(fecha: string | null): number {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
}

export function KanbanClient() {
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [filtro, setFiltro] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOT, setSelectedOT] = useState<any>(null);

  const [updating, setUpdating] = useState(false);

  const fetchOrdenes = () => {
    fetch('/api/ordenes')
      .then((r) => r.json())
      .then((d) => { setOrdenes(d ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchOrdenes(); }, []);

  const estadosVisibles = ESTADOS;

  const otsFiltradas = (ordenes ?? []).filter((ot: any) => ot.estado !== 'CERRADA').filter((ot: any) => {
    const q = filtro.toLowerCase();
    return (
      (ot?.vehiculo?.patente ?? '').toLowerCase().includes(q) ||
      (ot?.vehiculo?.cliente?.razonSocial ?? '').toLowerCase().includes(q) ||
      `OT-${String(ot?.otNumero ?? '').padStart(4, '0')}`.toLowerCase().includes(q)
    );
  });

  const cambiarEstado = async (otId: string, nuevoEstado: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/ordenes/${otId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      if (res.ok) {
        toast.success('Estado actualizado');
        fetchOrdenes();
        setSelectedOT(null);
      } else {
        toast.error('Error al actualizar');
      }
    } catch {
      toast.error('Error de conexión');
    }
    setUpdating(false);
  };

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight font-display">Tablero Kanban</h1>
          <div className="w-10 h-1 bg-primary mt-2 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar OT, patente, cliente..." className="pl-10 w-64" value={filtro} onChange={(e: any) => setFiltro(e.target.value)} />
          </div>

        </div>
      </div>

      {/* Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {estadosVisibles.map((estado) => {
          const otsCol = otsFiltradas.filter((ot: any) => ot?.estado === estado.id);
          return (
            <div key={estado.id} className="flex-shrink-0 w-[280px]">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: estado.color }} />
                <span className="text-sm font-semibold text-foreground">{estado.label}</span>
                <Badge variant="secondary" className="text-xs ml-auto">{otsCol.length}</Badge>
              </div>

              {/* Cards */}
              <ScrollArea className="h-[calc(100vh-260px)]">
                <div className="space-y-3 pr-2">
                  {loading ? (
                    [1, 2].map((i) => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)
                  ) : otsCol.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">Sin OTs</div>
                  ) : (
                    otsCol.map((ot: any, i: number) => {
                      const dias = diasDesde(ot?.fechaIngreso);
                      const esAlerta = estado.id === 'ESPERANDO_APROBACION' && diasDesde(ot?.fechaValorizacion ?? ot?.fechaIngreso) > 3;
                      return (
                        <motion.div key={ot?.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                          <Card
                            className={`cursor-pointer hover:shadow-lg transition-all border ${
                              esAlerta ? 'border-red-500/50 shadow-red-500/10' : 'border-border'
                            }`}
                            onClick={() => setSelectedOT(ot)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <span className="text-primary font-bold text-sm font-mono">
                                  OT-{String(ot?.otNumero ?? '').padStart(4, '0')}
                                </span>
                                {esAlerta && <AlertTriangle className="w-4 h-4 text-red-500" />}
                              </div>
                              <div className="text-foreground font-semibold text-base mb-0.5">{ot?.vehiculo?.patente}</div>
                              <div className="text-muted-foreground text-xs mb-2">
                                {ot?.vehiculo?.marca} {ot?.vehiculo?.modelo}
                              </div>
                              <div className="text-muted-foreground text-xs mb-1 truncate">{ot?.vehiculo?.cliente?.razonSocial}</div>
                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                                <span className="text-xs text-muted-foreground">{dias}d en taller</span>
                                {(ot?.valorTotal ?? 0) > 0 && (
                                  <span className="text-xs font-mono font-semibold text-foreground">{formatCLP(ot?.valorTotal)}</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>

      {/* Modal detalle OT */}
      <Dialog open={!!selectedOT} onOpenChange={() => setSelectedOT(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-primary font-mono font-bold text-xl">
                OT-{String(selectedOT?.otNumero ?? '').padStart(4, '0')}
              </span>
              <Badge style={{ backgroundColor: ESTADOS.find((e) => e.id === selectedOT?.estado)?.color, color: '#fff' }}>
                {ESTADOS.find((e) => e.id === selectedOT?.estado)?.label}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Patente</div>
                <div className="font-semibold text-foreground">{selectedOT?.vehiculo?.patente}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Vehículo</div>
                <div className="text-sm text-foreground">{selectedOT?.vehiculo?.marca} {selectedOT?.vehiculo?.modelo}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Cliente</div>
                <div className="text-sm text-foreground">{selectedOT?.vehiculo?.cliente?.razonSocial}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Kilom.</div>
                <div className="text-sm font-mono text-foreground">{(selectedOT?.kilometraje ?? 0).toLocaleString('es-CL')} km</div>
              </div>
            </div>

            {selectedOT?.motivoIngreso && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Motivo Ingreso</div>
                <div className="text-sm text-foreground">{selectedOT?.motivoIngreso}</div>
              </div>
            )}

            {(selectedOT?.valorTotal ?? 0) > 0 && (
              <div className="bg-muted rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Repuestos</span>
                  <span className="font-mono text-foreground">{formatCLP(selectedOT?.valorRepuestos ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Mano de Obra</span>
                  <span className="font-mono text-foreground">{formatCLP(selectedOT?.valorManoObra ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2 pt-2 border-t border-border font-bold">
                  <span className="text-foreground">Total</span>
                  <span className="font-mono text-primary">{formatCLP(selectedOT?.valorTotal ?? 0)}</span>
                </div>
              </div>
            )}

            {/* Cambiar estado */}
            <div>
              <div className="text-xs text-muted-foreground mb-2">Cambiar Estado</div>
              <Select
                value={selectedOT?.estado ?? ''}
                onValueChange={(val: string) => {
                  if (selectedOT?.id) cambiarEstado(selectedOT.id, val);
                }}
                disabled={updating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                        {e.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Link href={`/ot/${selectedOT?.id}`}>
              <Button className="w-full mt-2" variant="outline">
                <Eye className="w-4 h-4 mr-2" /> Ver Detalle Completo <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
