'use client';

import { useEffect, useState, useCallback } from 'react';
import { formatTelefonoInput } from '@/lib/validaciones';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Mail, Phone, MapPin, Pencil, Save, X, Truck, ChevronDown, ChevronRight, Hash, Calendar, DollarSign, Plus, Trash2, User, Briefcase, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const ESTADO_COLORS: Record<string, string> = {
  POR_DIAGNOSTICAR: '#6366f1', EN_COTIZACION: '#f97316', ESPERANDO_APROBACION: '#eab308',
  EN_TRABAJO: '#22c55e', POR_FACTURAR: '#F4B63D', CERRADA: '#64748b',
};
const ESTADO_LABELS: Record<string, string> = {
  POR_DIAGNOSTICAR: 'Por Diagnosticar', EN_COTIZACION: 'En Cotización', ESPERANDO_APROBACION: 'Esp. Aprobación',
  EN_TRABAJO: 'En Trabajo', POR_FACTURAR: 'Por Facturar', CERRADA: 'Cerrada',
};

function formatCLP(n: number | null | undefined) {
  if (n == null) return '$0';
  return '$' + Math.round(n).toLocaleString('es-CL');
}

export function ClienteDetalleClient({ clienteId }: { clienteId: string }) {
  const router = useRouter();
  const [cliente, setCliente] = useState<any>(null);
  const [deleteVehicleId, setDeleteVehicleId] = useState<string | null>(null);
  const [deleteVehiclePatente, setDeleteVehiclePatente] = useState('');
  const [deletingVehicle, setDeletingVehicle] = useState(false);
  const [deleteVehicleError, setDeleteVehicleError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

  // Portal password
  const [portalPassword, setPortalPassword] = useState('');
  const [savingPortal, setSavingPortal] = useState(false);

  // Nuevo vehículo
  const [showAddVehiculo, setShowAddVehiculo] = useState(false);
  const [nuevoVehiculo, setNuevoVehiculo] = useState({ patente: '', marca: '', modelo: '', tipoVehiculo: '', anio: '', motor: '', chasis: '', vin: '' });
  const [savingVehiculo, setSavingVehiculo] = useState(false);
  const [vehiculoError, setVehiculoError] = useState('');

  // Contactos
  const [contactos, setContactos] = useState<any[]>([]);
  const [showAddContacto, setShowAddContacto] = useState(false);
  const [nuevoContacto, setNuevoContacto] = useState({ nombre: '', cargo: '', email: '', telefono: '' });
  const [savingContacto, setSavingContacto] = useState(false);

  const cargarCliente = useCallback(() => {
    fetch(`/api/clientes/${clienteId}`)
      .then((r) => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then((d) => {
        setCliente(d);
        setContactos(d?.contactos ?? []);
        setForm({
          tipoCliente: d?.tipoCliente ?? 'EMPRESA',
          razonSocial: d?.razonSocial ?? '', rutEmpresa: d?.rutEmpresa ?? '',
          giro: d?.giro ?? '',
          nombreContacto: d?.nombreContacto ?? '', email: d?.email ?? '',
          telefono: d?.telefono ?? '', direccion: d?.direccion ?? '',
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [clienteId]);

  useEffect(() => { cargarCliente(); }, [cargarCliente]);

  const guardar = async () => {
    if (!form.razonSocial?.trim()) { toast.error('Nombre/Razón social requerido'); return; }
    if (form.tipoCliente !== 'PERSONA' && !form.giro?.trim()) { toast.error('Giro requerido'); return; }
    if (!form.direccion?.trim()) { toast.error('Dirección requerida'); return; }
    if (form.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { toast.error('Email inválido'); return; }
    if (form.telefono?.trim() && !/^\d{8,15}$/.test(form.telefono.replace(/[\s+]/g, ''))) { toast.error('Teléfono inválido'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setCliente(updated); setContactos(updated?.contactos ?? []);
      setEditando(false); toast.success('Cliente actualizado');
    } catch { toast.error('Error al guardar'); } finally { setSaving(false); }
  };

  const agregarContacto = async () => {
    if (!nuevoContacto.nombre || !nuevoContacto.email) { toast.error('Nombre y email son requeridos'); return; }
    setSavingContacto(true);
    try {
      const res = await fetch(`/api/clientes/${clienteId}/contactos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevoContacto),
      });
      if (!res.ok) throw new Error();
      const c = await res.json();
      setContactos([...contactos, c]);
      setNuevoContacto({ nombre: '', cargo: '', email: '', telefono: '' });
      setShowAddContacto(false);
      toast.success('Contacto agregado');
    } catch { toast.error('Error al agregar contacto'); } finally { setSavingContacto(false); }
  };

  const eliminarContacto = async (id: string) => {
    try {
      await fetch(`/api/clientes/${clienteId}/contactos?contactoId=${id}`, { method: 'DELETE' });
      setContactos(contactos.filter(c => c.id !== id));
      toast.success('Contacto eliminado');
    } catch { toast.error('Error'); }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-10 ">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="h-40 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="p-6 lg:p-10 ">
        <Button variant="ghost" onClick={() => router.push('/clientes')} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" /> Volver</Button>
        <p className="text-muted-foreground">Cliente no encontrado.</p>
      </div>
    );
  }

  const totalOTs = (cliente?.vehiculos ?? []).reduce((sum: number, v: any) => sum + (v?.ordenes?.length ?? 0), 0);

  return (
    <div className="p-6 lg:p-10 ">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push('/clientes')}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground tracking-tight font-display">{cliente?.razonSocial}</h1>
            {cliente?.activo === false && (
              <Badge className="text-[9px] bg-red-500/20 text-red-400">CUENTA DESACTIVADA</Badge>
            )}
          </div>
          <div className="w-10 h-1 bg-primary mt-1 rounded-full" />
        </div>
        {!editando && (
          <Button variant="outline" size="sm" onClick={() => setEditando(true)} className="text-xs">
            <Pencil className="w-3 h-3 mr-1" /> Editar
          </Button>
        )}
      </div>

      {/* Client Info Card */}
      <Card className="mb-6">
        <CardContent className="p-5">
          {editando ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">TIPO DE CLIENTE</label>
                  <select
                    value={form.tipoCliente ?? 'EMPRESA'}
                    onChange={e => setForm({ ...form, tipoCliente: e.target.value })}
                    className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="EMPRESA">Empresa</option>
                    <option value="PERSONA">Persona Natural</option>
                  </select>
                </div>
                {[
                  { label: form.tipoCliente === 'PERSONA' ? 'NOMBRE' : 'RAZÓN SOCIAL', key: 'razonSocial' },
                  { label: 'RUT', key: 'rutEmpresa' },
                  ...(form.tipoCliente !== 'PERSONA' ? [{ label: 'GIRO *', key: 'giro' }] : []),
                  { label: 'CONTACTO PRINCIPAL *', key: 'nombreContacto' }, { label: 'EMAIL', key: 'email' },
                  { label: 'TELÉFONO', key: 'telefono' }, { label: 'DIRECCIÓN *', key: 'direccion' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">{f.label}</label>
                    <Input value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: f.key === 'telefono' ? formatTelefonoInput(e.target.value) : e.target.value })} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={guardar} disabled={saving || !form.razonSocial?.trim() || !form.direccion?.trim() || (form.tipoCliente !== 'PERSONA' && !form.giro?.trim())} className="text-xs bg-primary hover:bg-primary/90">
                  <Save className="w-3 h-3 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditando(false); setForm({ tipoCliente: cliente.tipoCliente ?? 'EMPRESA', razonSocial: cliente.razonSocial, rutEmpresa: cliente.rutEmpresa ?? '', giro: cliente.giro ?? '', nombreContacto: cliente.nombreContacto ?? '', email: cliente.email ?? '', telefono: cliente.telefono ?? '', direccion: cliente.direccion ?? '' }); }} className="text-xs">
                  <X className="w-3 h-3 mr-1" /> Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">RUT:</span>
                  <span className="text-foreground font-medium ml-1">{cliente?.rutEmpresa || '—'}</span>
                  <Badge className={`text-[9px] ml-1 ${cliente?.tipoCliente === 'PERSONA' ? 'bg-purple-500/20 text-purple-400' : 'bg-sky-500/20 text-sky-400'}`}>
                    {cliente?.tipoCliente === 'PERSONA' ? 'Persona Natural' : 'Empresa'}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">{cliente?.tipoCliente === 'PERSONA' ? 'Actividad:' : 'Giro:'}</span>
                  <span className="text-foreground font-medium ml-1">{cliente?.giro || '—'}</span>
                </div>
                <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> <span className="text-foreground">{cliente?.email || '—'}</span></div>
                <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> <span className="text-foreground">{cliente?.telefono || '—'}</span></div>
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> <span className="text-foreground">{cliente?.direccion || '—'}</span></div>
                <div><span className="text-muted-foreground">Contacto:</span> <span className="text-foreground font-medium ml-1">{cliente?.nombreContacto || '—'}</span></div>
              </div>
              <div className="flex gap-4 sm:flex-col sm:items-end text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{cliente?.vehiculos?.length ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground font-bold tracking-wider">VEHÍCULOS</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalOTs}</div>
                  <div className="text-[10px] text-muted-foreground font-bold tracking-wider">OTs TOTAL</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ ACCESO PORTAL ═══ */}
      {cliente?.email && (
        <div className="mb-6 p-4 bg-secondary/20 rounded-lg border border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-black tracking-widest text-muted-foreground">ACCESO PORTAL CLIENTES</h2>
            <Badge className={`text-[9px] ${cliente?.passwordHash ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
              {cliente?.passwordHash ? 'Activo' : 'Sin acceso'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Permite al cliente acceder a /portal para ver sus vehículos y OTs.</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-muted-foreground">Nueva contraseña portal</label>
              <Input type="password" value={portalPassword} onChange={e => setPortalPassword(e.target.value)}
                placeholder="Min. 6 caracteres" className="mt-1" />
            </div>
            <Button size="sm" disabled={savingPortal || portalPassword.length < 6} onClick={async () => {
              setSavingPortal(true);
              try {
                await fetch(`/api/clientes/${clienteId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ portalPassword }) });
                toast.success('Acceso portal configurado');
                setPortalPassword('');
                cargarCliente();
              } catch { toast.error('Error'); } finally { setSavingPortal(false); }
            }} className="text-xs">
              {savingPortal ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
              {cliente?.passwordHash ? 'Actualizar' : 'Activar'}
            </Button>
          </div>
        </div>
      )}

      {/* ═══ HISTORIAL DE CAMBIOS ═══ */}
      {(cliente?.eventos?.length ?? 0) > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-black tracking-widest text-muted-foreground mb-3">HISTORIAL DE CAMBIOS</h2>
          <Card>
            <CardContent className="p-5 space-y-4">
              {cliente.eventos.map((ev: any) => (
                <div key={ev.id} className="flex gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${ev.tipoEvento === 'cuenta_desactivada' ? 'bg-red-500' : 'bg-primary'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${ev.tipoEvento === 'cuenta_desactivada' ? 'text-red-400' : 'text-foreground'}`}>{ev.titulo}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(ev.createdAt).toLocaleString('es-CL', { timeZone: 'America/Santiago' })}</span>
                    </div>
                    {ev.descripcion && <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-line">{ev.descripcion}</p>}
                    {ev.usuario && <p className="text-[10px] text-muted-foreground/70 mt-0.5">Por: {ev.usuario}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ CONTACTOS ═══ */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black tracking-widest text-muted-foreground">CONTACTOS</h2>
          <Button variant="outline" size="sm" onClick={() => setShowAddContacto(!showAddContacto)} className="text-xs">
            <Plus className="w-3 h-3 mr-1" /> Agregar Contacto
          </Button>
        </div>

        <AnimatePresence>
          {showAddContacto && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <Card className="mb-3">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">NOMBRE *</label>
                      <Input placeholder="Ej: María López" value={nuevoContacto.nombre} onChange={(e) => setNuevoContacto({ ...nuevoContacto, nombre: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">CARGO</label>
                      <Input placeholder="Ej: Jefa de Compras" value={nuevoContacto.cargo} onChange={(e) => setNuevoContacto({ ...nuevoContacto, cargo: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">EMAIL *</label>
                      <Input placeholder="correo@empresa.cl" value={nuevoContacto.email} onChange={(e) => setNuevoContacto({ ...nuevoContacto, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">TELÉFONO</label>
                      <Input placeholder="+56 9 xxxx xxxx" value={nuevoContacto.telefono} onChange={(e) => setNuevoContacto({ ...nuevoContacto, telefono: formatTelefonoInput(e.target.value) })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={agregarContacto} disabled={savingContacto} className="text-xs bg-primary hover:bg-primary/90">
                      <Save className="w-3 h-3 mr-1" /> {savingContacto ? 'Guardando...' : 'Guardar'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowAddContacto(false); setNuevoContacto({ nombre: '', cargo: '', email: '', telefono: '' }); }} className="text-xs">
                      <X className="w-3 h-3 mr-1" /> Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {contactos.length === 0 && !showAddContacto ? (
          <p className="text-muted-foreground text-sm">No hay contactos adicionales. Agrega secretarias, jefes de taller u otros receptores de cotizaciones.</p>
        ) : (
          <div className="space-y-2">
            {contactos.map((c: any) => (
              <Card key={c.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{c.nombre}</span>
                      {c.cargo && <Badge variant="secondary" className="text-[9px]"><Briefcase className="w-2.5 h-2.5 mr-0.5" />{c.cargo}</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>
                      {c.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.telefono}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => eliminarContacto(c.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ═══ FLOTA DE VEHÍCULOS ═══ */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-black tracking-widest text-muted-foreground">FLOTA DE VEHÍCULOS</h2>
        <Button size="sm" variant="outline" onClick={() => { setShowAddVehiculo(!showAddVehiculo); setVehiculoError(''); }} className="text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          <Plus className="w-3 h-3 mr-1" /> Agregar Vehículo
        </Button>
      </div>

      {showAddVehiculo && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div>
                <label className="text-[9px] font-bold tracking-wider text-muted-foreground mb-1 block">PATENTE *</label>
                <Input value={nuevoVehiculo.patente} onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, patente: e.target.value })} placeholder="XX-XX-00" className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-[9px] font-bold tracking-wider text-muted-foreground mb-1 block">MARCA</label>
                <Input value={nuevoVehiculo.marca} onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, marca: e.target.value })} className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-[9px] font-bold tracking-wider text-muted-foreground mb-1 block">MODELO</label>
                <Input value={nuevoVehiculo.modelo} onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, modelo: e.target.value })} className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-[9px] font-bold tracking-wider text-muted-foreground mb-1 block">TIPO</label>
                <Input value={nuevoVehiculo.tipoVehiculo} onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, tipoVehiculo: e.target.value })} placeholder="Camión, Furgón" className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-[9px] font-bold tracking-wider text-muted-foreground mb-1 block">AÑO</label>
                <Input type="number" value={nuevoVehiculo.anio} onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, anio: e.target.value })} className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-[9px] font-bold tracking-wider text-muted-foreground mb-1 block">MOTOR</label>
                <Input value={nuevoVehiculo.motor} onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, motor: e.target.value })} className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-[9px] font-bold tracking-wider text-muted-foreground mb-1 block">VIN / CHASIS</label>
                <Input value={nuevoVehiculo.vin} onChange={(e) => setNuevoVehiculo({ ...nuevoVehiculo, vin: e.target.value, chasis: e.target.value })} className="h-8 text-sm" />
              </div>
            </div>
            {vehiculoError && <p className="text-sm text-red-400 mb-2">{vehiculoError}</p>}
            <div className="flex gap-2">
              <Button size="sm" disabled={savingVehiculo} className="text-xs bg-primary hover:bg-primary/90" onClick={async () => {
                if (!nuevoVehiculo.patente.trim()) { setVehiculoError('Patente es requerida'); return; }
                setSavingVehiculo(true); setVehiculoError('');
                try {
                  const res = await fetch('/api/vehiculos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...nuevoVehiculo, clienteId }) });
                  const data = await res.json();
                  if (!res.ok) { setVehiculoError(data.error || 'Error'); setSavingVehiculo(false); return; }
                  cargarCliente();
                  setShowAddVehiculo(false);
                  setNuevoVehiculo({ patente: '', marca: '', modelo: '', tipoVehiculo: '', anio: '', motor: '', chasis: '', vin: '' });
                  toast.success('Vehículo agregado');
                } catch { setVehiculoError('Error de conexión'); } finally { setSavingVehiculo(false); }
              }}>
                {savingVehiculo ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} {savingVehiculo ? 'Guardando...' : 'Guardar'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddVehiculo(false)} className="text-xs"><X className="w-3 h-3 mr-1" /> Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(cliente?.vehiculos ?? []).length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay vehículos registrados.</p>
      ) : (
        <div className="space-y-2">
          {(cliente?.vehiculos ?? []).map((v: any) => (
            <Card key={v?.id} className="overflow-hidden">
              <button className="w-full p-4 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors" onClick={() => setExpandedVehicle(expandedVehicle === v?.id ? null : v?.id)}>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Truck className="w-4 h-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground text-sm">{v?.patente}</div>
                  <div className="text-xs text-muted-foreground">{[v?.marca, v?.modelo, v?.anio].filter(Boolean).join(' · ') || 'Sin datos'}</div>
                </div>
                <Badge variant="secondary" className="text-[10px] mr-2">{v?.ordenes?.length ?? 0} OTs</Badge>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteVehicleId(v?.id); setDeleteVehiclePatente(v?.patente || ''); setDeleteVehicleError(''); }}
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition mr-1"
                  title="Eliminar vehículo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {expandedVehicle === v?.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {expandedVehicle === v?.id && (v?.ordenes?.length ?? 0) > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="border-t border-border px-4 py-3 space-y-2 bg-secondary/20">
                      {(v?.ordenes ?? []).map((ot: any) => (
                        <Link key={ot?.id} href={`/ot/${ot?.id}`} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors group">
                          <div className="flex items-center gap-1.5 min-w-[60px]"><Hash className="w-3 h-3 text-muted-foreground" /><span className="font-mono font-bold text-foreground text-sm">OT-{ot?.otNumero}</span></div>
                          <Badge className="text-[9px] px-1.5 py-0" style={{ backgroundColor: ESTADO_COLORS[ot?.estado] + '22', color: ESTADO_COLORS[ot?.estado], borderColor: ESTADO_COLORS[ot?.estado] + '44' }}>{ESTADO_LABELS[ot?.estado] ?? ot?.estado}</Badge>
                          <span className="text-xs text-muted-foreground truncate flex-1">{ot?.motivoIngreso ?? '—'}</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{ot?.fechaIngreso ? new Date(ot.fechaIngreso).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : '—'}</span>
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" />{formatCLP(ot?.valorTotal)}</span>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          ))}
        </div>
      )}

      {/* Delete vehicle modal */}
      {deleteVehicleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { if (!deletingVehicle) { setDeleteVehicleId(null); setDeleteVehicleError(''); } }}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Eliminar vehículo</h3>
                <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              ¿Eliminar el vehículo <strong className="text-foreground font-mono">{deleteVehiclePatente}</strong>?
            </p>
            {deleteVehicleError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-400">{deleteVehicleError}</p>
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" size="sm" onClick={() => { setDeleteVehicleId(null); setDeleteVehicleError(''); }} disabled={deletingVehicle}>Cancelar</Button>
              <Button variant="destructive" size="sm" disabled={deletingVehicle} onClick={async () => {
                setDeletingVehicle(true);
                setDeleteVehicleError('');
                try {
                  const res = await fetch(`/api/vehiculos/${deleteVehicleId}`, { method: 'DELETE' });
                  const data = await res.json();
                  if (!res.ok) { setDeleteVehicleError(data.error || 'Error al eliminar'); setDeletingVehicle(false); return; }
                  // Refresh client data
                  cargarCliente();
                  setDeleteVehicleId(null);
                  toast.success('Vehículo eliminado');
                } catch { setDeleteVehicleError('Error de conexión'); } finally { setDeletingVehicle(false); }
              }}>
                {deletingVehicle ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
