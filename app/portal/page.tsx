'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, FileText, Loader2, LogOut, Calendar, Wrench, ChevronRight, UserCog, Save, ShieldAlert, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeToggleButton } from '@/components/theme-toggle-button';
import { toast } from 'sonner';
import Link from 'next/link';

const ESTADOS: Record<string, { label: string; color: string }> = {
  POR_DIAGNOSTICAR: { label: 'Por Diagnosticar', color: 'bg-indigo-500/20 text-indigo-400' },
  EN_COTIZACION: { label: 'En Cotización', color: 'bg-orange-500/20 text-orange-400' },
  ESPERANDO_APROBACION: { label: 'Esp. Aprobación', color: 'bg-yellow-500/20 text-yellow-400' },
  EN_TRABAJO: { label: 'En Trabajo', color: 'bg-emerald-500/20 text-emerald-400' },
  POR_FACTURAR: { label: 'Por Facturar', color: 'bg-[#F4B63D]/20 text-[#F4B63D]' },
  CERRADA: { label: 'Cerrada', color: 'bg-zinc-500/20 text-zinc-400' },
};

function formatCLP(v: number) { return '$' + Math.round(v ?? 0).toLocaleString('es-CL'); }
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export default function PortalDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'vehiculos' | 'ordenes' | 'datos'>('ordenes');
  const [form, setForm] = useState<any>({ razonSocial: '', giro: '', email: '', telefono: '', direccion: '', nombreContacto: '' });
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/portal/me')
      .then(r => { if (r.status === 401) { router.push('/portal/login'); return null; } return r.json(); })
      .then(d => {
        if (d) {
          setData(d);
          const c = d.cliente ?? {};
          setForm({ razonSocial: c.razonSocial ?? '', giro: c.giro ?? '', email: c.email ?? '', telefono: c.telefono ?? '', direccion: c.direccion ?? '', nombreContacto: c.nombreContacto ?? '' });
        }
        setLoading(false);
      })
      .catch(() => { router.push('/portal/login'); });
  }, [router]);

  const guardarDatos = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/portal/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const j = await r.json();
      if (!r.ok) { toast.error(j?.error || 'No se pudieron guardar los cambios'); return; }
      if (j?.sinCambios) { toast.info('No hay cambios para guardar'); return; }
      toast.success('Tus datos fueron actualizados');
      if (j?.cliente) setData((prev: any) => ({ ...prev, cliente: { ...prev.cliente, ...j.cliente } }));
    } catch { toast.error('Error al guardar'); } finally { setSaving(false); }
  };

  const eliminarCuenta = async () => {
    setDeleting(true);
    try {
      const r = await fetch('/api/portal/me', { method: 'DELETE' });
      if (!r.ok) { const j = await r.json().catch(() => ({})); toast.error(j?.error || 'No se pudo desactivar la cuenta'); setDeleting(false); return; }
      toast.success('Tu cuenta fue desactivada. Se notificó al taller.');
      setTimeout(() => router.push('/portal/login'), 1200);
    } catch { toast.error('Error al desactivar la cuenta'); setDeleting(false); }
  };

  const logout = async () => {
    await fetch('/api/portal/logout', { method: 'POST' });
    router.push('/portal/login');
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[#F4B63D]" />
    </div>
  );

  if (!data) return null;

  const { cliente, vehiculos, ordenes } = data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F4B63D]/10 border border-[#F4B63D]/30 flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#F4B63D]" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight">ÉXITO Fleet</h1>
              <p className="text-xs text-muted-foreground">Portal de Clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{cliente.razonSocial}</p>
              <p className="text-xs text-muted-foreground">{cliente.rutEmpresa || cliente.email || ''}</p>
            </div>
            <ThemeToggleButton />
            <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-1" /> Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-muted-foreground tracking-widest">VEHÍCULOS</p>
              <p className="text-3xl font-black mt-1">{vehiculos.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-muted-foreground tracking-widest">OTs TOTALES</p>
              <p className="text-3xl font-black mt-1">{ordenes.length}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-muted-foreground tracking-widest">EN PROCESO</p>
              <p className="text-3xl font-black text-[#F4B63D] mt-1">{ordenes.filter((o: any) => o.estado !== 'CERRADA').length}</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-[10px] font-bold text-muted-foreground tracking-widest">CERRADAS</p>
              <p className="text-3xl font-black text-emerald-500 mt-1">{ordenes.filter((o: any) => o.estado === 'CERRADA').length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          <button onClick={() => setTab('ordenes')}
            className={`px-5 py-3 text-xs font-bold tracking-widest uppercase rounded-t-md border-b-2 transition ${tab === 'ordenes' ? 'border-[#F4B63D] text-foreground bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <FileText className="w-4 h-4 inline mr-2" /> Órdenes de Trabajo
          </button>
          <button onClick={() => setTab('vehiculos')}
            className={`px-5 py-3 text-xs font-bold tracking-widest uppercase rounded-t-md border-b-2 transition ${tab === 'vehiculos' ? 'border-[#F4B63D] text-foreground bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <Truck className="w-4 h-4 inline mr-2" /> Vehículos
          </button>
          <button onClick={() => setTab('datos')}
            className={`px-5 py-3 text-xs font-bold tracking-widest uppercase rounded-t-md border-b-2 transition ${tab === 'datos' ? 'border-[#F4B63D] text-foreground bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <UserCog className="w-4 h-4 inline mr-2" /> Mis Datos
          </button>
        </div>

        {/* Ordenes */}
        {tab === 'ordenes' && (
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {ordenes.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Sin órdenes de trabajo registradas</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {ordenes.map((ot: any) => {
                    const est = ESTADOS[ot.estado] ?? { label: ot.estado, color: 'bg-zinc-500/20 text-zinc-400' };
                    return (
                      <Link key={ot.id} href={`/portal/ot/${ot.id}`}
                        className="flex items-center justify-between p-4 hover:bg-muted/50 transition cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-[#F4B63D]/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-[#F4B63D]" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">OT-{String(ot.otNumero).padStart(4, '0')}</p>
                            <p className="text-xs text-muted-foreground">{ot.vehiculo?.patente} — {[ot.vehiculo?.marca, ot.vehiculo?.modelo].filter(Boolean).join(' ')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground">{formatDate(ot.fechaIngreso)}</p>
                            {ot.mecanico && <p className="text-[10px] text-muted-foreground/70">{ot.mecanico.nombre}</p>}
                          </div>
                          <Badge className={`text-[10px] ${est.color}`}>{est.label}</Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Vehiculos */}
        {tab === 'vehiculos' && (
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              {vehiculos.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Sin vehículos registrados</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {vehiculos.map((v: any) => (
                    <div key={v.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Truck className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{v.patente}</p>
                          <p className="text-xs text-muted-foreground">{[v.marca, v.modelo].filter(Boolean).join(' ') || 'Sin datos'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{v.tipoVehiculo || ''}</p>
                        {v.anio && <p className="text-xs text-muted-foreground/70">{v.anio}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mis Datos */}
        {tab === 'datos' && (
          <div className="space-y-6 max-w-3xl">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><UserCog className="w-4 h-4 text-[#F4B63D]" /> Mis Datos</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Puedes revisar y actualizar tus datos de contacto en cualquier momento. Los cambios quedan registrados en el historial del taller conforme a la Ley de Protección de Datos Personales.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">RAZÓN SOCIAL *</label>
                    <Input value={form.razonSocial} onChange={e => setForm({ ...form, razonSocial: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">RUT</label>
                    <Input value={cliente.rutEmpresa || ''} disabled className="opacity-60" />
                    <p className="text-[10px] text-muted-foreground/70 mt-1">El RUT solo puede ser modificado por el taller.</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">GIRO</label>
                    <Input value={form.giro} onChange={e => setForm({ ...form, giro: e.target.value })} placeholder="Ej: Transporte de carga" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">NOMBRE DE CONTACTO</label>
                    <Input value={form.nombreContacto} onChange={e => setForm({ ...form, nombreContacto: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">EMAIL</label>
                    <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">TELÉFONO</label>
                    <Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">DIRECCIÓN</label>
                    <Input value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
                  </div>
                </div>
                <div className="pt-2">
                  <Button onClick={guardarDatos} disabled={saving || !form.razonSocial.trim()} className="bg-[#F4B63D] hover:bg-[#F4B63D]/90 text-black">
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Zona peligrosa: desactivar cuenta */}
            <Card className="bg-card border-red-500/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-red-400"><ShieldAlert className="w-4 h-4" /> Eliminar mis datos / Desactivar cuenta</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Puedes solicitar la desactivación de tu cuenta y el cese del acceso al portal. Tu historial se conservará según las obligaciones legales del taller, pero perderás el acceso al portal y el taller será notificado.</p>
              </CardHeader>
              <CardContent>
                {!showDelete ? (
                  <Button variant="outline" onClick={() => setShowDelete(true)} className="border-red-500/40 text-red-400 hover:bg-red-500/10">
                    <ShieldAlert className="w-4 h-4 mr-2" /> Desactivar mi cuenta
                  </Button>
                ) : (
                  <div className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                    <div className="flex gap-2 text-sm text-red-300">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <p>Esta acción desactivará tu acceso al portal y notificará al taller. Para confirmar, escribe <span className="font-bold">DESACTIVAR</span> a continuación.</p>
                    </div>
                    <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="Escribe DESACTIVAR" className="max-w-xs" />
                    <div className="flex gap-2">
                      <Button onClick={eliminarCuenta} disabled={deleting || confirmText.trim().toUpperCase() !== 'DESACTIVAR'} className="bg-red-600 hover:bg-red-700 text-white">
                        {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                        {deleting ? 'Desactivando...' : 'Confirmar desactivación'}
                      </Button>
                      <Button variant="ghost" onClick={() => { setShowDelete(false); setConfirmText(''); }} disabled={deleting}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
