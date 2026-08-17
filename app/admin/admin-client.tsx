'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { validarRut, validarTelefono, validarEmail } from '@/lib/validaciones';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Building2, Plus, Pencil, Save, X, Users, Truck, FileText, Search, LogOut, Loader2, ShieldCheck, Palette, ArrowLeft, Upload, Wrench, Mail, Phone, MapPin, Calendar, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const ROLES_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  JEFE_TALLER: 'Jefe de Taller',
  RECEPCION: 'Recepción',
  FINANZAS: 'Finanzas',
};

function LogoUploader({ currentUrl, onUploaded }: { currentUrl: string; onUploaded: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5 MB'); return; }
    setUploading(true);
    try {
      const res = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: true }),
      });
      const { uploadUrl, cloud_storage_path } = await res.json();
      if (!uploadUrl) { toast.error('Error al obtener URL de subida'); return; }
      const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!putRes.ok) { toast.error('Error al subir imagen al storage'); return; }
      const publicUrl = uploadUrl.split('?')[0];
      onUploaded(publicUrl);
      toast.success('Logo subido');
    } catch { toast.error('Error al subir imagen'); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  return (
    <div>
      <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">LOGO DEL TALLER</label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30 flex-shrink-0">
          {currentUrl ? (
            <Image src={currentUrl} alt="Logo" width={64} height={64} className="w-full h-full object-contain" unoptimized />
          ) : (
            <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
          )}
        </div>
        <div>
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
            {uploading ? 'Subiendo...' : currentUrl ? 'Cambiar' : 'Subir logo'}
          </Button>
          {currentUrl && (
            <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground ml-1" onClick={() => onUploaded('')}>Quitar</Button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

const CAMPOS_TALLER = [
  {l:'Nombre *',k:'nombre'},{l:'Slug (URL)',k:'slug'},{l:'Razón Social',k:'razonSocial'},
  {l:'RUT',k:'rut'},{l:'Dirección',k:'direccion'},{l:'Teléfono',k:'telefono'},
  {l:'Celular',k:'celular'},{l:'Email',k:'email'},{l:'División',k:'division'},
];

function TallerEditForm({ isNew, form, setForm, saving, guardar, setEditId }: {
  isNew: boolean; form: any; setForm: (f: any) => void;
  saving: boolean; guardar: (isNew: boolean) => void; setEditId: (id: any) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CAMPOS_TALLER.map(f => (
          <div key={f.k}>
            <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">{f.l}</label>
            <Input value={form[f.k] ?? ''} onChange={(e: any) => setForm({ ...form, [f.k]: e.target.value })} placeholder={f.k === 'slug' ? 'Se genera del nombre si vacio' : ''} />
          </div>
        ))}
        <div>
          <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">COLOR PRIMARIO</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={form.colorPrimario ?? 'hsl(217,74%,45%)'} onChange={(e: any) => setForm({ ...form, colorPrimario: e.target.value })} className="w-10 h-8 rounded border border-border cursor-pointer" />
            <span className="text-xs text-muted-foreground">{form.colorPrimario}</span>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-bold tracking-wider text-muted-foreground mb-1 block">COLOR FONDO</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={form.colorFondo ?? '#121212'} onChange={(e: any) => setForm({ ...form, colorFondo: e.target.value })} className="w-10 h-8 rounded border border-border cursor-pointer" />
            <span className="text-xs text-muted-foreground">{form.colorFondo}</span>
          </div>
        </div>
      </div>
      <LogoUploader currentUrl={form.logoUrl ?? ''} onUploaded={(url: string) => setForm({ ...form, logoUrl: url })} />
      <div className="flex gap-2">
        <Button onClick={() => guardar(isNew)} disabled={saving || !form.nombre?.trim()} className="bg-[hsl(217,74%,45%)] hover:bg-[hsl(217,74%,45%)]/90 text-black">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : isNew ? <Plus className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Guardando...' : isNew ? 'Crear Taller' : 'Guardar Cambios'}
        </Button>
        {!isNew && <Button variant="ghost" onClick={() => setEditId(null)} className="text-xs"><X className="w-3 h-3 mr-1" /> Cancelar</Button>}
      </div>
    </div>
  );
}

export default function AdminClient() {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const [talleres, setTalleres] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'talleres' | 'nuevo' | 'detalle'>('talleres');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [filtro, setFiltro] = useState('');
  const [detalle, setDetalle] = useState<any>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [showNuevoUsuario, setShowNuevoUsuario] = useState(false);
  const [nuEmail, setNuEmail] = useState('');
  const [nuNombre, setNuNombre] = useState('');
  const [nuPassword, setNuPassword] = useState('');
  const [nuRol, setNuRol] = useState('ADMIN');
  const [nuSaving, setNuSaving] = useState(false);
  const [editUsuarioId, setEditUsuarioId] = useState<string | null>(null);
  const [euNombre, setEuNombre] = useState('');
  const [euRol, setEuRol] = useState('ADMIN');
  const [euPassword, setEuPassword] = useState('');
  const [euSaving, setEuSaving] = useState(false);

  const fetchTalleres = async () => {
    try {
      const r = await fetch('/api/admin/talleres');
      if (r.ok) setTalleres(await r.json());
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchTalleres(); }, []);

  const talleresFiltrados = useMemo(() => {
    if (!filtro) return talleres;
    const q = filtro.toLowerCase();
    return talleres.filter(t =>
      t.nombre.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q) || t.razonSocial?.toLowerCase().includes(q)
    );
  }, [talleres, filtro]);

  const nuevoTallerForm = {
    nombre: '', slug: '', razonSocial: '', rut: '', direccion: '', telefono: '', celular: '', email: '', division: '', logoUrl: '', colorPrimario: 'hsl(217,74%,45%)', colorFondo: '#121212',
  };

  const startEdit = (t: any) => {
    setEditId(t.id);
    setForm({ nombre: t.nombre, razonSocial: t.razonSocial, rut: t.rut, direccion: t.direccion, telefono: t.telefono, celular: t.celular, email: t.email, division: t.division, logoUrl: t.logoUrl, colorPrimario: t.colorPrimario, colorFondo: t.colorFondo });
  };

  const guardar = async (isNew = false) => {
    if (!form.nombre?.trim()) { toast.error('El nombre del taller es requerido'); return; }
    if (form.rut?.trim() && !validarRut(form.rut)) { toast.error('RUT inválido — formato: 12.345.678-9'); return; }
    if (form.telefono?.trim() && !validarTelefono(form.telefono)) { toast.error('Teléfono inválido — solo dígitos, 8-15 caracteres'); return; }
    if (form.celular?.trim() && !validarTelefono(form.celular)) { toast.error('Celular inválido — solo dígitos, 8-15 caracteres'); return; }
    if (form.email?.trim() && !validarEmail(form.email)) { toast.error('Email inválido'); return; }
    setSaving(true);
    try {
      const url = '/api/admin/talleres';
      const method = isNew ? 'POST' : 'PATCH';
      const payload = isNew ? form : { ...form, id: editId };
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) { toast.error(j?.error || 'Error'); return; }
      toast.success(isNew ? 'Taller creado' : 'Taller actualizado');
      setEditId(null);
      setTab('talleres');
      fetchTalleres();
      // Refresh detail if open
      if (detalle && !isNew) { verDetalle(detalle.id); }
    } catch { toast.error('Error'); } finally { setSaving(false); }
  };

  const verDetalle = async (tallerId: string) => {
    setDetalleLoading(true);
    setTab('detalle');
    try {
      const r = await fetch(`/api/admin/talleres?id=${tallerId}`);
      if (r.ok) setDetalle(await r.json());
      else toast.error('Error cargando taller');
    } catch { toast.error('Error'); } finally { setDetalleLoading(false); }
  };

  const crearUsuario = async (tallerId: string) => {
    if (!nuEmail.trim() || !nuNombre.trim() || !nuPassword.trim()) {
      toast.error('Nombre, email y contraseña son requeridos'); return;
    }
    if (nuPassword.length < 6) { toast.error('Contraseña mínimo 6 caracteres'); return; }
    setNuSaving(true);
    try {
      const r = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nuEmail.trim(), nombre: nuNombre.trim(), password: nuPassword, rol: nuRol, tallerId }),
      });
      const j = await r.json();
      if (!r.ok) { toast.error(j?.error || 'Error al crear usuario'); setNuSaving(false); return; }
      toast.success(`Usuario ${nuEmail} creado`);
      setNuEmail(''); setNuNombre(''); setNuPassword(''); setNuRol('ADMIN');
      setShowNuevoUsuario(false);
      verDetalle(tallerId);
    } catch { toast.error('Error'); }
    setNuSaving(false);
  };

  const startEditUsuario = (u: any) => {
    setEditUsuarioId(u.id);
    setEuNombre(u.nombre);
    setEuRol(u.rol);
    setEuPassword('');
  };

  const editarUsuario = async (tallerId: string) => {
    if (!euNombre.trim()) { toast.error('Nombre requerido'); return; }
    setEuSaving(true);
    try {
      const payload: any = { id: editUsuarioId, nombre: euNombre.trim(), rol: euRol };
      if (euPassword.trim()) {
        if (euPassword.length < 6) { toast.error('Contraseña mínimo 6 caracteres'); setEuSaving(false); return; }
        payload.password = euPassword;
      }
      const r = await fetch('/api/usuarios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!r.ok) { toast.error(j?.error || 'Error al editar usuario'); setEuSaving(false); return; }
      toast.success('Usuario actualizado');
      setEditUsuarioId(null);
      verDetalle(tallerId);
    } catch { toast.error('Error'); } finally { setEuSaving(false); }
  };

  const eliminarUsuario = async (userId: string, nombre: string, tallerId: string) => {
    if (!confirm(`¿Eliminar usuario "${nombre}"? Si tiene OTs asociadas, será desactivado en lugar de eliminado.`)) return;
    try {
      const r = await fetch(`/api/usuarios?id=${userId}`, { method: 'DELETE' });
      const j = await r.json();
      if (!r.ok) { toast.error(j?.error || 'Error'); return; }
      toast.success(j?.desactivado ? `${nombre} desactivado (tiene OTs asociadas)` : `${nombre} eliminado`);
      verDetalle(tallerId);
    } catch { toast.error('Error'); }
  };

  const toggleUsuarioActivo = async (userId: string, activo: boolean, tallerId: string) => {
    try {
      await fetch('/api/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, activo: !activo }),
      });
      toast.success(activo ? 'Usuario desactivado' : 'Usuario activado');
      verDetalle(tallerId);
    } catch { toast.error('Error'); }
  };


  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-[hsl(217,74%,45%)]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[hsl(217,74%,45%)]/10 border border-[hsl(217,74%,45%)]/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[hsl(217,74%,45%)]" />
            </div>
            <div>
              <h1 className=”font-extrabold text-lg tracking-tight”>D Motor — Super Admin</h1>
              <p className="text-xs text-muted-foreground">Gestión de talleres y usuarios</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">{(session?.user as any)?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/auth/login' })} className="text-muted-foreground">
              <LogOut className="w-4 h-4 mr-1" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* Stats */}
        {tab !== 'detalle' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card><CardContent className="p-4"><p className="text-[10px] font-bold text-muted-foreground tracking-widest">TALLERES</p><p className="text-3xl font-black mt-1">{talleres.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-[10px] font-bold text-muted-foreground tracking-widest">USUARIOS TOTAL</p><p className="text-3xl font-black mt-1">{talleres.reduce((s: number, t: any) => s + (t._count?.usuarios ?? 0), 0)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-[10px] font-bold text-muted-foreground tracking-widest">CLIENTES TOTAL</p><p className="text-3xl font-black mt-1">{talleres.reduce((s: number, t: any) => s + (t._count?.clientes ?? 0), 0)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-[10px] font-bold text-muted-foreground tracking-widest">OTs TOTAL</p><p className="text-3xl font-black text-[hsl(217,74%,45%)] mt-1">{talleres.reduce((s: number, t: any) => s + (t._count?.ordenes ?? 0), 0)}</p></CardContent></Card>
          </div>
        )}

        {/* Tabs (hidden when showing detail) */}
        {tab !== 'detalle' && (
          <div className="flex items-center gap-2 mb-6">
            <button onClick={() => setTab('talleres')}
              className={`px-5 py-3 text-xs font-bold tracking-widest uppercase rounded-t-md border-b-2 transition ${tab === 'talleres' ? 'border-[hsl(217,74%,45%)] text-foreground bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Building2 className="w-4 h-4 inline mr-2" /> Talleres
            </button>
            <button onClick={() => { setTab('nuevo'); setForm({ ...nuevoTallerForm }); }}
              className={`px-5 py-3 text-xs font-bold tracking-widest uppercase rounded-t-md border-b-2 transition ${tab === 'nuevo' ? 'border-[hsl(217,74%,45%)] text-foreground bg-card' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              <Plus className="w-4 h-4 inline mr-2" /> Nuevo Taller
            </button>
          </div>
        )}

        {/* TALLERES LIST */}
        {tab === 'talleres' && (
          <div>
            {talleres.length > 3 && (
              <div className="relative mb-4 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar taller..." value={filtro} onChange={e => setFiltro(e.target.value)} className="pl-9" />
              </div>
            )}
            <div className="space-y-4">
              {talleresFiltrados.map((t: any) => (
                <Card key={t.id} className={`border transition hover:border-[hsl(217,74%,45%)]/40 cursor-pointer ${!t.activo ? 'opacity-50' : ''}`}>
                  <CardContent className="p-5">
                    {editId === t.id ? (
                      <TallerEditForm isNew={false} form={form} setForm={setForm} saving={saving} guardar={guardar} setEditId={setEditId} />
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-4" onClick={() => verDetalle(t.id)}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: `${t.colorPrimario}20` }}>
                          {t.logoUrl ? (
                            <Image src={t.logoUrl} alt={t.nombre} width={48} height={48} className="w-full h-full object-contain" unoptimized />
                          ) : (
                            <Building2 className="w-6 h-6" style={{ color: t.colorPrimario }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base">{t.nombre}</h3>
                            <Badge className="text-[9px] bg-primary/20 text-primary">{t.slug}</Badge>
                            {!t.activo && <Badge className="text-[9px] bg-red-500/20 text-red-400">Inactivo</Badge>}
                          </div>
                          {t.razonSocial && <p className=”text-xs text-muted-foreground mt-0.5”>{t.razonSocial}{t.rut ? ` — ${t.rut}` : ''}</p>}
                          <div className="flex gap-4 mt-2">
                            <span className="text-xs text-muted-foreground"><Users className="w-3 h-3 inline mr-1" />{t._count?.usuarios ?? 0} usuarios</span>
                            <span className="text-xs text-muted-foreground"><Truck className="w-3 h-3 inline mr-1" />{t._count?.vehiculos ?? 0} Vehículos</span>
                            <span className="text-xs text-muted-foreground"><FileText className="w-3 h-3 inline mr-1" />{t._count?.ordenes ?? 0} OTs</span>
                          </div>
                          <div className="flex items-center gap-1 mt-2">
                            <Palette className="w-3 h-3 text-muted-foreground" />
                            <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: t.colorPrimario }} title={`Primario: ${t.colorPrimario}`} />
                            <div className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: t.colorFondo }} title={`Fondo: ${t.colorFondo}`} />
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <Button variant="outline" size="sm" onClick={() => startEdit(t)} className="text-xs">
                            <Pencil className="w-3 h-3 mr-1" /> Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => crearUsuario(t.id)} className="text-xs">
                            <Plus className="w-3 h-3 mr-1" /> Usuario
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {talleresFiltrados.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>{filtro ? 'No se encontraron talleres' : 'No hay talleres registrados'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NUEVO TALLER */}
        {tab === 'nuevo' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4 text-[hsl(217,74%,45%)]" /> Crear Nuevo Taller</CardTitle>
            </CardHeader>
            <CardContent>
              <TallerEditForm isNew={true} form={form} setForm={setForm} saving={saving} guardar={guardar} setEditId={setEditId} />
            </CardContent>
          </Card>
        )}

        {/* DETALLE TALLER */}
        {tab === 'detalle' && (
          <div>
            <button onClick={() => { setTab('talleres'); setDetalle(null); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition">
              <ArrowLeft className="w-4 h-4" /> Volver a talleres
            </button>

            {detalleLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[hsl(217,74%,45%)]" />
              </div>
            ) : detalle ? (
              <div className="space-y-6">
                {/* Header del taller */}
                <Card className="border-[hsl(217,74%,45%)]/30">
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row gap-6">
                      {/* Logo */}
                      <div className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-border" style={{ backgroundColor: `${detalle.colorPrimario}15` }}>
                        {detalle.logoUrl ? (
                          <Image src={detalle.logoUrl} alt={detalle.nombre} width={80} height={80} className="w-full h-full object-contain" unoptimized />
                        ) : (
                          <Building2 className="w-10 h-10" style={{ color: detalle.colorPrimario }} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-2xl font-black">{detalle.nombre}</h2>
                          <Badge className="text-[10px] bg-primary/20 text-primary">{detalle.slug}</Badge>
                          {!detalle.activo && <Badge className="text-[10px] bg-red-500/20 text-red-400">Inactivo</Badge>}
                        </div>
                        {detalle.razonSocial && <p className=”text-sm text-muted-foreground mt-1”>{detalle.razonSocial}{detalle.rut ? ` — ${detalle.rut}` : ''}</p>}
                        {detalle.division && <p className="text-xs text-muted-foreground mt-0.5">División: {detalle.division}</p>}

                        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-muted-foreground">
                          {detalle.direccion && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {detalle.direccion}</span>}
                          {detalle.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {detalle.telefono}</span>}
                          {detalle.celular && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {detalle.celular}</span>}
                          {detalle.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /><span suppressHydrationWarning>{detalle.email}</span></span>}
                        </div>

                        <div className="flex items-center gap-2 mt-3">
                          <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                          <div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: detalle.colorPrimario }} title={`Primario: ${detalle.colorPrimario}`} />
                          <span className="text-[10px] text-muted-foreground">{detalle.colorPrimario}</span>
                          <div className="w-5 h-5 rounded-full border border-border ml-2" style={{ backgroundColor: detalle.colorFondo }} title={`Fondo: ${detalle.colorFondo}`} />
                          <span className="text-[10px] text-muted-foreground">{detalle.colorFondo}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0 self-start">
                        <Button variant="outline" size="sm" onClick={() => { startEdit(detalle); setTab('talleres'); }} className="text-xs">
                          <Pencil className="w-3 h-3 mr-1" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => crearUsuario(detalle.id)} className="text-xs">
                          <Plus className="w-3 h-3 mr-1" /> Usuario
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card><CardContent className="p-4"><p className="text-[10px] font-bold text-muted-foreground tracking-widest">USUARIOS</p><p className="text-3xl font-black mt-1">{detalle._count?.usuarios ?? 0}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-[10px] font-bold text-muted-foreground tracking-widest">CLIENTES</p><p className="text-3xl font-black mt-1">{detalle._count?.clientes ?? 0}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-[10px] font-bold text-muted-foreground tracking-widest">VEHÍCULOS</p><p className="text-3xl font-black mt-1">{detalle._count?.vehiculos ?? 0}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-[10px] font-bold text-muted-foreground tracking-widest">ÓRDENES</p><p className="text-3xl font-black text-[hsl(217,74%,45%)] mt-1">{detalle._count?.ordenes ?? 0}</p></CardContent></Card>
                </div>

                {/* Usuarios del taller */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-[hsl(217,74%,45%)]" /> Usuarios ({detalle.usuarios?.length ?? 0})</CardTitle>
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setShowNuevoUsuario(v => !v); setNuEmail(''); setNuNombre(''); setNuPassword(''); }}>
                        <Plus className="w-3 h-3 mr-1" /> Nuevo Usuario
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {showNuevoUsuario && (
                      <div className="p-3 border border-primary/30 rounded-lg bg-primary/5 space-y-2">
                        <p className="text-[10px] font-black tracking-widest text-primary">CREAR USUARIO PARA ESTE TALLER</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input placeholder="Nombre completo" value={nuNombre} onChange={e => setNuNombre(e.target.value)} className="h-8 text-xs" />
                          <Input placeholder="Email" type="email" value={nuEmail} onChange={e => setNuEmail(e.target.value)} className="h-8 text-xs" />
                          <Input placeholder="Contraseña (mín. 6 caracteres)" type="password" value={nuPassword} onChange={e => setNuPassword(e.target.value)} className="h-8 text-xs" />
                          <select value={nuRol} onChange={e => setNuRol(e.target.value)} className="h-8 text-xs bg-background border border-border rounded-md px-2 text-foreground">
                            <option value="ADMIN">Administrador</option>
                            <option value="JEFE_TALLER">Jefe de Taller</option>
                            <option value="RECEPCION">Recepción</option>
                            <option value="FINANZAS">Finanzas</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs" onClick={() => crearUsuario(detalle.id)} disabled={nuSaving}>
                            {nuSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />} Crear
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNuevoUsuario(false)}>Cancelar</Button>
                        </div>
                      </div>
                    )}
                    {detalle.usuarios?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border text-muted-foreground">
                              <th className="text-left py-2 px-3 font-semibold">Nombre</th>
                              <th className="text-left py-2 px-3 font-semibold">Email</th>
                              <th className="text-left py-2 px-3 font-semibold">Rol</th>
                              <th className="text-left py-2 px-3 font-semibold">Estado</th>
                              <th className="text-left py-2 px-3 font-semibold">Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detalle.usuarios.map((u: any) => (
                              <React.Fragment key={u.id}>
                                <tr className="border-b border-border/50 hover:bg-muted/20">
                                  <td className="py-2.5 px-3 font-medium">{u.nombre}</td>
                                  <td className="py-2.5 px-3 text-muted-foreground"><span suppressHydrationWarning>{u.email}</span></td>
                                  <td className="py-2.5 px-3">
                                    <Badge className="text-[9px]" variant="secondary">{ROLES_LABELS[u.rol] || u.rol}</Badge>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${u.activo ? 'text-emerald-500' : 'text-red-400'}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                      {u.activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <button onClick={() => startEditUsuario(u)}
                                        className="text-[10px] font-bold px-2 py-0.5 rounded border border-[hsl(217,74%,45%)]/40 text-[hsl(217,74%,45%)] hover:bg-[hsl(217,74%,45%)]/10 transition">
                                        Editar
                                      </button>
                                      <button onClick={() => toggleUsuarioActivo(u.id, u.activo, detalle.id)}
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded border transition ${u.activo ? 'border-red-400/40 text-red-400 hover:bg-red-400/10' : 'border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10'}`}>
                                        {u.activo ? 'Bloquear' : 'Activar'}
                                      </button>
                                      <button onClick={() => eliminarUsuario(u.id, u.nombre, detalle.id)}
                                        className="text-[10px] font-bold px-2 py-0.5 rounded border border-red-600/40 text-red-600 hover:bg-red-600/10 transition">
                                        Eliminar
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                                {editUsuarioId === u.id && (
                                  <tr className="bg-muted/30">
                                    <td colSpan={5} className="px-3 py-3">
                                      <div className="flex flex-wrap gap-2 items-end">
                                        <div>
                                          <label className="text-[9px] font-bold text-muted-foreground block mb-1">NOMBRE</label>
                                          <Input className="h-7 text-xs w-40" value={euNombre} onChange={e => setEuNombre(e.target.value)} />
                                        </div>
                                        <div>
                                          <label className="text-[9px] font-bold text-muted-foreground block mb-1">ROL</label>
                                          <select value={euRol} onChange={e => setEuRol(e.target.value)} className="h-7 text-xs px-2 rounded border border-border bg-background">
                                            {Object.entries(ROLES_LABELS).filter(([k]) => k !== 'SUPER_ADMIN').map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
                                          </select>
                                        </div>
                                        <div>
                                          <label className="text-[9px] font-bold text-muted-foreground block mb-1">NUEVA CONTRASEÑA (opcional)</label>
                                          <Input type="password" className="h-7 text-xs w-36" value={euPassword} onChange={e => setEuPassword(e.target.value)} placeholder="Dejar vacío = sin cambio" />
                                        </div>
                                        <Button size="sm" className="h-7 text-xs" onClick={() => editarUsuario(detalle.id)} disabled={euSaving}>
                                          {euSaving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null} Guardar
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditUsuarioId(null)}>Cancelar</Button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">No hay usuarios en este taller. Crea el primero.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Mecánicos del taller */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2"><Wrench className="w-4 h-4 text-[hsl(217,74%,45%)]" /> Mecánicos ({detalle.mecanicos?.length ?? 0})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {detalle.mecanicos?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {detalle.mecanicos.map((m: any) => (
                          <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50">
                            <div className="w-8 h-8 rounded-full bg-[hsl(217,74%,45%)]/10 flex items-center justify-center flex-shrink-0">
                              <Wrench className="w-4 h-4 text-[hsl(217,74%,45%)]" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{m.nombre}</p>

                            </div>
                            <span className={`ml-auto text-[10px] font-medium ${m.activo ? 'text-emerald-500' : 'text-red-400'}`}>{m.activo ? 'Activo' : 'Inactivo'}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-4 text-center">No hay Mecánicos en este taller</p>
                    )}
                  </CardContent>
                </Card>

                {/* Info adicional */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-[hsl(217,74%,45%)]" /> Información</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Creado:</span>
                        <span className="ml-2 font-medium">{new Date(detalle.createdAt).toLocaleDateString('es-CL', { timeZone: 'UTC' })} {new Date(detalle.createdAt).toLocaleTimeString('es-CL', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Última actualización:</span>
                        <span className="ml-2 font-medium">{new Date(detalle.updatedAt).toLocaleDateString('es-CL', { timeZone: 'UTC' })} {new Date(detalle.updatedAt).toLocaleTimeString('es-CL', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mecánicos:</span>
                        <span className="ml-2 font-medium">{detalle._count?.mecanicos ?? 0}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Facturas:</span>
                        <span className="ml-2 font-medium">{detalle._count?.facturas ?? 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-12">No se encontró el taller</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

