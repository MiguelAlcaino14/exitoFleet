'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, ChevronLeft, ChevronRight, Truck, Trash2, Pencil, X, Save,
  AlertTriangle, Building2, Hash, Wrench, Filter, Plus, Loader2
} from 'lucide-react';

const TIPOS_VEHICULO = [
  'Automovil', 'SUV', 'Camioneta', 'Furgon/Van', 'Camion', 'Bus/Minibus','Motocicleta', 'Otro',
];

const anioActual = new Date().getFullYear();
const ANIOS = Array.from({ length: anioActual - 1970 + 2 }, (_, i) => anioActual + 1 - i);
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function VehiculosClient() {
  const router = useRouter();
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [buscar, setBuscar] = useState('');

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePatente, setDeletePatente] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Clients for reassignment
  const [clientes, setClientes] = useState<any[]>([]);

  // Nuevo vehiculo
  const [showNuevo, setShowNuevo] = useState(false);
  const [nuevoData, setNuevoData] = useState<any>({ patente: '', marca: '', modelo: '', tipoVehiculo: '', anio: '', motor: '', chasis: '', vin: '', clienteId: '' });
  const [creando, setCreando] = useState(false);
  const [crearError, setCrearError] = useState('');

  // Filtro tipo (C7)
  const [filtroTipo, setFiltroTipo] = useState('');

  // Crear cliente inline (C5)
  const [showCrearCliente, setShowCrearCliente] = useState(false);
  const [nuevoClienteForm, setNuevoClienteForm] = useState({ tipoCliente: 'EMPRESA', razonSocial: '', rutEmpresa: '', giro: '', email: '', telefono: '', direccion: '' });
  const [creandoCliente, setCreandoCliente] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (buscar) params.set('buscar', buscar);
      if (filtroTipo) params.set('tipo', filtroTipo);

      const res = await fetch(`/api/vehiculos?${params.toString()}`);
      const data = await res.json();
      setVehiculos(data.vehiculos ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setVehiculos([]);
    } finally {
      setLoading(false);
    }
  }, [page, buscar, filtroTipo]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [buscar]);
  useEffect(() => { setPage(1); }, [filtroTipo]);

  // Load clients list for edit modal
  useEffect(() => {
    if (editId) {
      fetch('/api/clientes').then(r => r.json()).then(d => setClientes(d ?? [])).catch(() => {});
    }
  }, [editId]);

  // Load clients for new vehicle modal
  useEffect(() => {
    if (showNuevo) {
      fetch('/api/clientes').then(r => r.json()).then(d => setClientes(d ?? [])).catch(() => {});
    }
  }, [showNuevo]);

  // Mínimo 5 alfanum, máximo 6 alfanum: motos (ABC12), autos nuevos (ABCD12), autos antiguos (AB1234)
  const PATENTE_RE = /^[A-Z]{3}\d{2}$|^[A-Z]{4}\d{2}$|^[A-Z]{2}\d{3}$|^[A-Z]{2}\d{4}$|^[A-Z]{3}\d{3}$/;

  const handleCrearVehiculo = async () => {
    if (!nuevoData.patente?.trim()) { setCrearError('Patente es requerida'); return; }
    const patenteClean = nuevoData.patente.trim().toUpperCase().replace(/[\s-]/g, '');
    if (!PATENTE_RE.test(patenteClean)) { setCrearError('Patente inválida. Formatos válidos: ABC-12 (moto), ABCD-12, AB-1234'); return; }

    if (!nuevoData.vin?.trim()) { setCrearError('VIN / Chasis es requerido'); return; }
    if (!nuevoData.clienteId) { setCrearError('Debe seleccionar un cliente'); return; }
    setCreando(true); setCrearError('');
    try {
      // Verificar patente duplicada
      const chkRes = await fetch(`/api/vehiculos?buscar=${encodeURIComponent(nuevoData.patente.trim())}&page=1`);
      const chkData = await chkRes.json();
      const existe = (chkData.vehiculos ?? []).some((v: any) => v.patente?.toUpperCase() === nuevoData.patente.trim().toUpperCase());
      if (existe) { setCrearError(`La patente ${nuevoData.patente.trim().toUpperCase()} ya está registrada en el sistema.`); setCreando(false); return; }

      const res = await fetch('/api/vehiculos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoData) });
      const data = await res.json();
      if (!res.ok) { setCrearError(data.error || 'Error al crear'); setCreando(false); return; }
      fetchData();
      setShowNuevo(false);
      setNuevoData({ patente: '', marca: '', modelo: '', tipoVehiculo: '', anio: '', motor: '', chasis: '', vin: '', clienteId: '' });
      setShowCrearCliente(false);
      setNuevoClienteForm({ tipoCliente: 'EMPRESA', razonSocial: '', rutEmpresa: '', giro: '', email: '', telefono: '', direccion: '' });
      toast.success('Vehículo creado');
    } catch { setCrearError('Error de conexión'); } finally { setCreando(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/vehiculos/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error || 'Error al eliminar'); setDeleting(false); return; }
      setVehiculos(prev => prev.filter(v => v.id !== deleteId));
      setTotal(prev => prev - 1);
      setDeleteId(null);
      toast.success('Vehículo eliminado');
    } catch { setDeleteError('Error de conexión'); } finally { setDeleting(false); }
  };

  const handleSave = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/vehiculos/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Error al guardar'); setSaving(false); return; }
      setVehiculos(prev => prev.map(v => v.id === editId ? data : v));
      setEditId(null);
      toast.success('Vehículo actualizado');
    } catch { toast.error('Error de conexión'); } finally { setSaving(false); }
  };

  const openEdit = (v: any) => {
    setEditId(v.id);
    setEditData({
      patente: v.patente || '',
      marca: v.marca || '',
      modelo: v.modelo || '',
      tipoVehiculo: v.tipoVehiculo || '',
      anio: v.anio || '',
      motor: v.motor || '',
      chasis: v.chasis || '',
      vin: v.vin || '',
      clienteId: v.clienteId || '',
      kilometraje: v.kilometraje != null ? String(v.kilometraje) : '',
    });
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight font-display">Vehículos</h1>
          <div className="w-10 h-1 bg-primary mt-2 rounded-full" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            {total} vehículo{total !== 1 ? 's' : ''}
          </Badge>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar patente, marca, cliente..."
              className="pl-9 w-[220px]"
              value={buscar}
              onChange={(e: any) => setBuscar(e.target.value)}
            />
          </div>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="border border-input bg-background rounded-md px-3 py-2 text-sm h-10 focus:outline-none focus:ring-2 focus:ring-ring text-foreground">
            <option value="">Todos los tipos</option>
            {TIPOS_VEHICULO.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button size="sm" onClick={() => { setShowNuevo(true); setCrearError(''); setShowCrearCliente(false); }} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold">
            <Plus className="w-4 h-4 mr-1" /> Nuevo vehículo
          </Button>
        </div>
      </div>

      {/* Nuevo Vehículo — card inline */}
      {showNuevo && (
        <Card className="mb-6 border-primary/40">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Truck className="w-4 h-4 text-primary" /></div>
                <h3 className="font-semibold text-foreground text-base">Nuevo Vehículo</h3>
              </div>
              <button onClick={() => { setShowNuevo(false); setShowCrearCliente(false); setNuevoClienteForm({ tipoCliente: 'EMPRESA', razonSocial: '', rutEmpresa: '', giro: '', email: '', telefono: '', direccion: '' }); }} className="p-1 hover:bg-secondary rounded-lg" disabled={creando}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Patente *</label>
                <Input value={nuevoData.patente} onChange={(e: any) => setNuevoData({ ...nuevoData, patente: e.target.value })} placeholder="XX-XX-00"
                  className={!nuevoData.patente?.trim() ? 'border-red-400 focus-visible:ring-red-400' : ''} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo de vehículo *</label>
                <select value={nuevoData.tipoVehiculo} onChange={(e: any) => setNuevoData({ ...nuevoData, tipoVehiculo: e.target.value })}
                  className={`w-full h-9 rounded-md border bg-background px-3 text-sm text-foreground ${!nuevoData.tipoVehiculo ? 'border-red-400' : 'border-border'}`}>
                  <option value="">Selecciona un tipo</option>
                  {TIPOS_VEHICULO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Marca *</label>
                <Input value={nuevoData.marca} onChange={(e: any) => setNuevoData({ ...nuevoData, marca: e.target.value })} placeholder="Volvo, Scania"
                  className={!nuevoData.marca?.trim() ? 'border-red-400 focus-visible:ring-red-400' : ''} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Modelo *</label>
                <Input value={nuevoData.modelo} onChange={(e: any) => setNuevoData({ ...nuevoData, modelo: e.target.value })} placeholder="FH 540"
                  className={!nuevoData.modelo?.trim() ? 'border-red-400 focus-visible:ring-red-400' : ''} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Año *</label>
                <select value={nuevoData.anio} onChange={(e: any) => setNuevoData({ ...nuevoData, anio: e.target.value })}
                  className={`w-full h-9 rounded-md border bg-background px-3 text-sm text-foreground ${!nuevoData.anio ? 'border-red-400' : 'border-border'}`}>
                  <option value="">Selecciona un año</option>
                  {ANIOS.map(a => <option key={a} value={String(a)}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Motor</label>
                <Input value={nuevoData.motor} onChange={(e: any) => setNuevoData({ ...nuevoData, motor: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">VIN / Chasis *</label>
                <Input value={nuevoData.vin} onChange={(e: any) => setNuevoData({ ...nuevoData, vin: e.target.value, chasis: e.target.value })} placeholder="17 caracteres"
                  className={!nuevoData.vin?.trim() ? 'border-red-400 focus-visible:ring-red-400' : ''} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Cliente *</label>
                <select value={nuevoData.clienteId}
                  onChange={(e) => {
                    if (e.target.value === '__nuevo__') { setShowCrearCliente(true); return; }
                    setNuevoData({ ...nuevoData, clienteId: e.target.value });
                  }}
                  className={`w-full h-9 rounded-md border bg-background px-3 text-sm text-foreground ${!nuevoData.clienteId ? 'border-red-400' : 'border-border'}`}>
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c: any) => <option key={c.id} value={c.id}>{c.razonSocial || 'Sin nombre'} {c.rutEmpresa ? `(${c.rutEmpresa})` : ''}</option>)}
                  <option value="__nuevo__">+ Agregar cliente</option>
                </select>
                {showCrearCliente && (
                  <div className="mt-2 p-3 border border-primary/30 rounded-lg bg-primary/5">
                    <p className="text-xs font-bold text-muted-foreground mb-2">Nuevo cliente</p>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={nuevoClienteForm.tipoCliente} onChange={e => setNuevoClienteForm({...nuevoClienteForm, tipoCliente: e.target.value, giro: ''})}
                        className="h-8 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                        <option value="EMPRESA">Empresa</option>
                        <option value="PERSONA">Persona natural</option>
                      </select>
                      <Input value={nuevoClienteForm.rutEmpresa} onChange={e => setNuevoClienteForm({...nuevoClienteForm, rutEmpresa: e.target.value})}
                        placeholder="RUT *" className={`text-sm h-8 ${!nuevoClienteForm.rutEmpresa.trim() ? 'border-red-400 focus-visible:ring-red-400' : ''}`} />
                      <Input value={nuevoClienteForm.razonSocial} onChange={e => setNuevoClienteForm({...nuevoClienteForm, razonSocial: e.target.value})}
                        placeholder={nuevoClienteForm.tipoCliente === 'PERSONA' ? 'Nombre completo *' : 'Razón social *'}
                        className={`text-sm h-8 col-span-2 ${!nuevoClienteForm.razonSocial.trim() ? 'border-red-400 focus-visible:ring-red-400' : ''}`} />
                      {nuevoClienteForm.tipoCliente === 'EMPRESA' && (
                        <Input value={nuevoClienteForm.giro} onChange={e => setNuevoClienteForm({...nuevoClienteForm, giro: e.target.value})}
                          placeholder="Giro *"
                          className={`text-sm h-8 col-span-2 ${!nuevoClienteForm.giro.trim() ? 'border-red-400 focus-visible:ring-red-400' : ''}`} />
                      )}
                      <Input value={nuevoClienteForm.direccion} onChange={e => setNuevoClienteForm({...nuevoClienteForm, direccion: e.target.value})}
                        placeholder="Dirección *"
                        className={`text-sm h-8 col-span-2 ${!nuevoClienteForm.direccion.trim() ? 'border-red-400 focus-visible:ring-red-400' : ''}`} />
                      <Input value={nuevoClienteForm.telefono} onChange={e => setNuevoClienteForm({...nuevoClienteForm, telefono: e.target.value})}
                        placeholder="Teléfono" className="text-sm h-8" />
                      <Input value={nuevoClienteForm.email} onChange={e => setNuevoClienteForm({...nuevoClienteForm, email: e.target.value})}
                        placeholder="Email" className="text-sm h-8" type="email" />
                      <div className="col-span-2 flex gap-2 pt-1">
                      <Button size="sm" disabled={creandoCliente || !nuevoClienteForm.razonSocial.trim() || !nuevoClienteForm.rutEmpresa.trim() || !nuevoClienteForm.direccion.trim() || (nuevoClienteForm.tipoCliente === 'EMPRESA' && !nuevoClienteForm.giro.trim())} onClick={async () => {
                        setCreandoCliente(true);
                        try {
                          const res = await fetch('/api/clientes', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(nuevoClienteForm) });
                          const d = await res.json();
                          if (!res.ok) { toast.error(d.error || 'Error al crear cliente'); return; }
                          setClientes(prev => [...prev, d]);
                          setNuevoData((prev: any) => ({ ...prev, clienteId: d.id }));
                          setShowCrearCliente(false);
                          setNuevoClienteForm({ tipoCliente: 'EMPRESA', razonSocial: '', rutEmpresa: '', giro: '', email: '', telefono: '', direccion: '' });
                          toast.success('Cliente creado');
                        } catch { toast.error('Error'); } finally { setCreandoCliente(false); }
                      }} className="text-xs h-7">
                        {creandoCliente ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                        {creandoCliente ? 'Creando...' : 'Crear cliente'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowCrearCliente(false)} className="text-xs h-7">Cancelar</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {crearError && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-3"><p className="text-sm text-red-400">{crearError}</p></div>}
            <div className="flex gap-3 justify-end mt-4">
              <Button variant="outline" size="sm" onClick={() => { setShowNuevo(false); setShowCrearCliente(false); }} disabled={creando}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
              <Button size="sm" onClick={handleCrearVehiculo} disabled={creando} className="bg-primary text-primary-foreground">
                {creando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} {creando ? 'Creando...' : 'Crear Vehículo'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">PATENTE</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase hidden sm:table-cell">MARCA / MODELO</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase hidden md:table-cell">TIPO</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase hidden lg:table-cell">AÑO</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">CLIENTE</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase text-center">OTs</th>
                    <th className="px-4 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase text-center w-24">ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {vehiculos.length > 0 ? vehiculos.map((v: any) => (
                    <tr key={v?.id} className="border-t border-border hover:bg-secondary/10 transition">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Truck className="w-4 h-4 text-primary" />
                          </div>
                          <span className="font-mono font-bold text-foreground text-sm">{v?.patente}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">
                        {[v?.marca, v?.modelo].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground hidden md:table-cell">
                        {v?.tipoVehiculo || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">
                        {v?.anio || '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => router.push(`/clientes/${v?.cliente?.id}`)}
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          {v?.cliente?.razonSocial || 'Sin cliente'}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge variant="secondary" className="text-[10px]">
                          {v?._count?.ordenes ?? 0}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(v)}
                            className="p-1.5 rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary transition"
                            title="Editar vehículo"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setDeleteId(v?.id); setDeletePatente(v?.patente || 'Sin patente'); setDeleteError(''); }}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition"
                            title="Eliminar vehículo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-muted-foreground">
                        <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No se encontraron vehículos</p>
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
            Página {page} de {totalPages} · {total} vehículos
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

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { if (!deleting) { setDeleteId(null); setDeleteError(''); } }}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Eliminar vehículo</h3>
                <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              ¿Eliminar el vehículo <strong className="text-foreground font-mono">{deletePatente}</strong>?
            </p>
            {deleteError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-400">{deleteError}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setDeleteId(null); setDeleteError(''); }} disabled={deleting}>Cancelar</Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { if (!saving) setEditId(null); }}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground text-lg">Editar vehículo</h3>
              <button onClick={() => setEditId(null)} className="p-1 hover:bg-secondary rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Patente</label>
                <Input value={editData.patente} onChange={(e: any) => setEditData({ ...editData, patente: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                <select value={editData.tipoVehiculo} onChange={(e: any) => setEditData({ ...editData, tipoVehiculo: e.target.value })}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                  <option value="">Selecciona un tipo</option>
                  {TIPOS_VEHICULO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Marca</label>
                <Input value={editData.marca} onChange={(e: any) => setEditData({ ...editData, marca: e.target.value })} placeholder="Volvo, Scania" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Modelo</label>
                <Input value={editData.modelo} onChange={(e: any) => setEditData({ ...editData, modelo: e.target.value })} placeholder="FH 540" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Año</label>
                <select value={editData.anio} onChange={(e: any) => setEditData({ ...editData, anio: e.target.value })}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground">
                  <option value="">Selecciona un año</option>
                  {ANIOS.map(a => <option key={a} value={String(a)}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Motor</label>
                <Input value={editData.motor} onChange={(e: any) => setEditData({ ...editData, motor: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">VIN / Chasis</label>
                <Input value={editData.vin || editData.chasis} onChange={(e: any) => setEditData({ ...editData, vin: e.target.value, chasis: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Kilometraje</label>
                <Input type="text" inputMode="numeric" value={editData.kilometraje} onChange={(e: any) => { const v = e.target.value.replace(/\D/g, ''); setEditData({ ...editData, kilometraje: v }); }} placeholder="0" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Cliente asignado</label>
                <select
                  value={editData.clienteId}
                  onChange={(e) => setEditData({ ...editData, clienteId: e.target.value })}
                  className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.razonSocial || 'Sin nombre'} {c.rutEmpresa ? `(${c.rutEmpresa})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <Button variant="outline" size="sm" onClick={() => setEditId(null)} disabled={saving}>
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground">
                <Save className="w-4 h-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
