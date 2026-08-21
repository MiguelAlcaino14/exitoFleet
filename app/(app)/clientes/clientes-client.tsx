'use client';

import { useEffect, useState, useMemo } from 'react';
import { formatRutInput, formatTelefonoInput, validarRut, validarEmail, validarTelefono } from '@/lib/validaciones';
import Link from 'next/link';
import { Users, Building2, Mail, Phone, Truck, Search, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Plus, X, Save, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const PAGE_SIZE = 20;

export function ClientesClient() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Nuevo cliente
  const [showNuevo, setShowNuevo] = useState(false);
  const [tipoCliente, setTipoCliente] = useState<'empresa' | 'persona'>('empresa');
  const [nuevoForm, setNuevoForm] = useState({ razonSocial: '', rutEmpresa: '', giro: '', nombreContacto: '', email: '', telefono: '', direccion: '' });
  const [creando, setCreando] = useState(false);
  const [crearError, setCrearError] = useState('');
  const [crearErrores, setCrearErrores] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/clientes')
      .then((r) => r.json())
      .then((d) => { setClientes(d ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const clientesFiltrados = useMemo(() => {
    const q = filtro.toLowerCase();
    if (!q) return clientes;
    return (clientes ?? []).filter((c: any) =>
      (c?.razonSocial ?? '').toLowerCase().includes(q) ||
      (c?.rutEmpresa ?? '').toLowerCase().includes(q) ||
      (c?.nombreContacto ?? '').toLowerCase().includes(q) ||
      (c?.email ?? '').toLowerCase().includes(q)
    );
  }, [clientes, filtro]);

  const totalPages = Math.max(1, Math.ceil(clientesFiltrados.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginados = clientesFiltrados.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [filtro]);

  const handleCrear = async () => {
    const errs: Record<string, string> = {};
    if (!nuevoForm.razonSocial.trim()) errs.razonSocial = tipoCliente === 'empresa' ? 'Razón social requerida' : 'Nombre requerido';
    if (!nuevoForm.rutEmpresa.trim()) errs.rutEmpresa = 'RUT requerido';
    else if (!validarRut(nuevoForm.rutEmpresa)) errs.rutEmpresa = 'RUT inválido';
    if (!nuevoForm.email.trim()) errs.email = 'Email requerido';
    else if (!validarEmail(nuevoForm.email)) errs.email = 'Email inválido';
    if (!nuevoForm.telefono.trim()) errs.telefono = 'Teléfono requerido';
    else if (!validarTelefono(nuevoForm.telefono)) errs.telefono = 'Teléfono inválido';
    if (tipoCliente === 'empresa' && !nuevoForm.nombreContacto.trim()) errs.nombreContacto = 'Nombre de contacto requerido';
    setCrearErrores(errs);
    if (Object.keys(errs).length > 0) return;

    setCreando(true); setCrearError('');
    try {
      const res = await fetch('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoForm) });
      const data = await res.json();
      if (!res.ok) { setCrearError(data.error || 'Error al crear'); setCreando(false); return; }
      setClientes(prev => [...prev, data].sort((a, b) => (a.razonSocial ?? '').localeCompare(b.razonSocial ?? '')));
      setShowNuevo(false);
      setNuevoForm({ razonSocial: '', rutEmpresa: '', giro: '', nombreContacto: '', email: '', telefono: '', direccion: '' });
      setCrearErrores({});
      toast.success('Cliente creado');
    } catch { setCrearError('Error de conexión'); } finally { setCreando(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/clientes/${deleteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'Error al eliminar');
        setDeleting(false);
        return;
      }
      setClientes(prev => prev.filter(c => c.id !== deleteId));
      setDeleteId(null);
      setDeleteName('');
    } catch {
      setDeleteError('Error de conexión');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-[1600px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight font-display">Clientes</h1>
          <div className="w-10 h-1 bg-primary mt-2 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs whitespace-nowrap">
            {clientesFiltrados.length} cliente{clientesFiltrados.length !== 1 ? 's' : ''}
          </Badge>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, RUT, contacto..."
              className="pl-9 w-[280px]"
              value={filtro}
              onChange={(e: any) => setFiltro(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => { setShowNuevo(true); setCrearError(''); setCrearErrores({}); setNuevoForm({ razonSocial: '', rutEmpresa: '', giro: '', nombreContacto: '', email: '', telefono: '', direccion: '' }); }} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold">
            <Plus className="w-4 h-4 mr-1" /> Nuevo cliente
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary/30 text-left">
                  <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">EMPRESA</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase hidden sm:table-cell">RUT</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase hidden md:table-cell">CONTACTO</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase hidden lg:table-cell">EMAIL</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase hidden lg:table-cell">TELÉFONO</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase text-center">VEHÍCULOS</th>
                  <th className="px-5 py-3 text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase text-center w-12"></th>
                </tr>
              </thead>
              <tbody>
                {paginados.length > 0 ? paginados.map((cliente: any) => (
                  <tr key={cliente?.id} className="border-t border-border hover:bg-secondary/10 transition cursor-pointer" onClick={() => window.location.href = `/clientes/${cliente?.id}`}>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold text-foreground text-sm truncate">{cliente?.razonSocial}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground hidden sm:table-cell">{cliente?.rutEmpresa || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground hidden md:table-cell">{cliente?.nombreContacto || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">{cliente?.email || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground hidden lg:table-cell">{cliente?.telefono || '—'}</td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant="secondary" className="text-[10px]">
                        <Truck className="w-3 h-3 mr-1" />{cliente?._count?.vehiculos ?? 0}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteId(cliente?.id); setDeleteName(cliente?.razonSocial || 'Sin nombre'); setDeleteError(''); }}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No se encontraron clientes</td></tr>
                )}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { if (!deleting) { setDeleteId(null); setDeleteError(''); } }}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Eliminar cliente</h3>
                <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              ¿Estás seguro de que deseas eliminar al cliente <strong className="text-foreground">{deleteName}</strong>? Se eliminarán también sus vehículos y contactos asociados.
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) { pageNum = i + 1; }
              else if (currentPage <= 3) { pageNum = i + 1; }
              else if (currentPage >= totalPages - 2) { pageNum = totalPages - 4 + i; }
              else { pageNum = currentPage - 2 + i; }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="icon"
                  className={`h-8 w-8 text-xs ${currentPage === pageNum ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Nuevo Cliente Modal */}
      {showNuevo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { if (!creando) { setShowNuevo(false); setCrearErrores({}); } }}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-lg">Nuevo cliente</h3>
              <button onClick={() => { setShowNuevo(false); setCrearErrores({}); }} className="p-1 hover:bg-secondary rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            {/* Selector Persona / Empresa */}
            <div className="flex gap-2 mb-4 bg-secondary/20 p-1 rounded-lg">
              {(['empresa', 'persona'] as const).map(t => (
                <button key={t} type="button"
                  className={`flex-1 py-2 rounded-md text-sm font-semibold transition ${tipoCliente === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setTipoCliente(t)}>
                  {t === 'empresa' ? 'Empresa' : 'Persona'}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">{tipoCliente === 'empresa' ? 'Razón social *' : 'Nombre *'}</label>
                <Input value={nuevoForm.razonSocial}
                  onChange={(e: any) => { setNuevoForm({ ...nuevoForm, razonSocial: e.target.value }); setCrearErrores(p => ({ ...p, razonSocial: '' })); }}
                  placeholder={tipoCliente === 'empresa' ? 'Empresa Transportes S.A.' : 'Juan Pérez'}
                  className={crearErrores.razonSocial ? 'border-red-500' : ''} />
                {crearErrores.razonSocial && <p className="text-xs text-red-500 mt-1">{crearErrores.razonSocial}</p>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{tipoCliente === 'empresa' ? 'RUT empresa *' : 'RUT *'}</label>
                <Input value={nuevoForm.rutEmpresa}
                  onChange={(e: any) => { setNuevoForm({ ...nuevoForm, rutEmpresa: formatRutInput(e.target.value) }); setCrearErrores(p => ({ ...p, rutEmpresa: '' })); }}
                  placeholder="76.314.706-1"
                  className={crearErrores.rutEmpresa ? 'border-red-500' : ''} />
                {crearErrores.rutEmpresa && <p className="text-xs text-red-500 mt-1">{crearErrores.rutEmpresa}</p>}
              </div>
              {tipoCliente === 'empresa' && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Giro</label>
                  <Input value={nuevoForm.giro} onChange={(e: any) => setNuevoForm({ ...nuevoForm, giro: e.target.value })} placeholder="Transporte de carga" />
                </div>
              )}
              {tipoCliente === 'empresa' && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nombre de contacto *</label>
                  <Input value={nuevoForm.nombreContacto}
                    onChange={(e: any) => { setNuevoForm({ ...nuevoForm, nombreContacto: e.target.value }); setCrearErrores(p => ({ ...p, nombreContacto: '' })); }}
                    placeholder="Juan Pérez"
                    className={crearErrores.nombreContacto ? 'border-red-500' : ''} />
                  {crearErrores.nombreContacto && <p className="text-xs text-red-500 mt-1">{crearErrores.nombreContacto}</p>}
                </div>
              )}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email *</label>
                <Input type="email" value={nuevoForm.email}
                  onChange={(e: any) => { setNuevoForm({ ...nuevoForm, email: e.target.value }); setCrearErrores(p => ({ ...p, email: '' })); }}
                  placeholder="contacto@empresa.cl"
                  className={crearErrores.email ? 'border-red-500' : ''} />
                {crearErrores.email && <p className="text-xs text-red-500 mt-1">{crearErrores.email}</p>}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Teléfono *</label>
                <Input value={nuevoForm.telefono}
                  onChange={(e: any) => { setNuevoForm({ ...nuevoForm, telefono: e.target.value }); setCrearErrores(p => ({ ...p, telefono: '' })); }}
                  placeholder="+56 9 1234 5678"
                  className={crearErrores.telefono ? 'border-red-500' : ''} />
                {crearErrores.telefono && <p className="text-xs text-red-500 mt-1">{crearErrores.telefono}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
                <Input value={nuevoForm.direccion} onChange={(e: any) => setNuevoForm({ ...nuevoForm, direccion: e.target.value })} placeholder="Av. Principal 123, Santiago" />
              </div>
            </div>
            {crearError && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-3"><p className="text-sm text-red-400">{crearError}</p></div>}
            <div className="flex gap-3 justify-end mt-5">
              <Button variant="outline" size="sm" onClick={() => setShowNuevo(false)} disabled={creando}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
              <Button size="sm" onClick={handleCrear} disabled={creando} className="bg-primary text-primary-foreground">
                {creando ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />} {creando ? 'Creando...' : 'Crear Cliente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
