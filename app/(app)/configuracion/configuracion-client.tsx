'use client';

import { useEffect, useState, useMemo } from 'react';
import { Building2, Mail, Plus, Trash2, Star, Loader2, Users, Shield, Eye, EyeOff, Save, UserPlus, ToggleLeft, ToggleRight, Wrench, Pencil, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const ROLES: Record<string, { label: string; color: string }> = {
  ADMIN: { label: 'Administrador', color: 'bg-primary/20 text-primary' },
  JEFE_TALLER: { label: 'Jefe de Taller', color: 'bg-emerald-500/20 text-emerald-400' },
  RECEPCION: { label: 'Recepción', color: 'bg-blue-500/20 text-blue-400' },
  FINANZAS: { label: 'Finanzas', color: 'bg-violet-500/20 text-violet-400' },
};

export function ConfiguracionClient() {
  // Datos empresa
  const [empresa, setEmpresa] = useState<any>({});
  const [empresaLoading, setEmpresaLoading] = useState(true);
  const [empresaSaving, setEmpresaSaving] = useState(false);

  // Cuentas correo
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [cuentasLoading, setCuentasLoading] = useState(true);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [cuentaSaving, setCuentaSaving] = useState(false);

  // Usuarios
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [usuariosLoading, setUsuariosLoading] = useState(true);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [showNuevoUsuario, setShowNuevoUsuario] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [nuevoRol, setNuevoRol] = useState('JEFE_TALLER');
  const [showPassword, setShowPassword] = useState(false);
  const [usuarioSaving, setUsuarioSaving] = useState(false);

  // Mecánicos
  const [mecanicos, setMecanicos] = useState<any[]>([]);
  const [mecanicosLoading, setMecanicosLoading] = useState(true);
  const [nuevoMecanico, setNuevoMecanico] = useState('');
  const [mecanicoSaving, setMecanicoSaving] = useState(false);
  const [editMecId, setEditMecId] = useState<string | null>(null);
  const [editMecNombre, setEditMecNombre] = useState('');

  // Tab activo
  const [seccion, setSeccion] = useState<'empresa' | 'correo' | 'usuarios' | 'mecanicos'>('empresa');

  const usuariosFiltrados = useMemo(() => {
    const q = filtroUsuario.trim().toLowerCase();
    if (!q) return usuarios;
    return (usuarios ?? []).filter((u: any) =>
      (u?.nombre ?? '').toLowerCase().includes(q) ||
      (u?.email ?? '').toLowerCase().includes(q) ||
      (ROLES[u?.rol]?.label ?? u?.rol ?? '').toLowerCase().includes(q)
    );
  }, [usuarios, filtroUsuario]);

  useEffect(() => {
    fetch('/api/configuracion-taller').then(r => r.json()).then(d => { setEmpresa(d ?? {}); setEmpresaLoading(false); }).catch(() => setEmpresaLoading(false));
    fetch('/api/cuentas-correo').then(r => r.json()).then(d => { setCuentas(d ?? []); setCuentasLoading(false); }).catch(() => setCuentasLoading(false));
    fetch('/api/usuarios').then(r => r.json()).then(d => { setUsuarios(d ?? []); setUsuariosLoading(false); }).catch(() => setUsuariosLoading(false));
    fetch('/api/mecanicos').then(r => r.json()).then(d => { setMecanicos(d ?? []); setMecanicosLoading(false); }).catch(() => setMecanicosLoading(false));
  }, []);

  const fetchMecanicos = async () => {
    const r = await fetch('/api/mecanicos').then(r => r.json());
    setMecanicos(r ?? []);
  };

  const crearMecanico = async () => {
    if (!nuevoMecanico.trim()) { toast.error('Nombre requerido'); return; }
    setMecanicoSaving(true);
    const res = await fetch('/api/mecanicos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nuevoMecanico }) });
    if (res.ok) { toast.success('Mecánico creado'); setNuevoMecanico(''); await fetchMecanicos(); }
    else { const d = await res.json(); toast.error(d.error || 'Error'); }
    setMecanicoSaving(false);
  };

  const toggleMecanicoActivo = async (m: any) => {
    await fetch('/api/mecanicos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, activo: !m.activo }) });
    await fetchMecanicos();
    toast.success(m.activo ? 'Mecánico desactivado' : 'Mecánico activado');
  };

  const guardarEditMecanico = async () => {
    if (!editMecNombre.trim()) return;
    await fetch('/api/mecanicos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editMecId, nombre: editMecNombre.trim() }) });
    setEditMecId(null);
    await fetchMecanicos();
    toast.success('Nombre actualizado');
  };

  const eliminarMecanico = async (id: string) => {
    const res = await fetch(`/api/mecanicos?id=${id}`, { method: 'DELETE' });
    if (res.ok) { toast.success('Mecánico eliminado'); await fetchMecanicos(); }
    else { const d = await res.json(); toast.error(d.error || 'Error'); }
  };

  const guardarEmpresa = async () => {
    setEmpresaSaving(true);
    try {
      const res = await fetch('/api/configuracion-taller', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empresa),
      });
      if (!res.ok) throw new Error();
      toast.success('Datos del taller guardados');
    } catch { toast.error('Error al guardar'); }
    setEmpresaSaving(false);
  };

  const agregarCuenta = async () => {
    if (!nombre.trim() || !email.trim()) { toast.error('Nombre y email requeridos'); return; }
    setCuentaSaving(true);
    await fetch('/api/cuentas-correo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, predeterminada: cuentas.length === 0 }),
    });
    setNombre(''); setEmail('');
    const r = await fetch('/api/cuentas-correo').then(r => r.json());
    setCuentas(r ?? []);
    setCuentaSaving(false);
    toast.success('Cuenta agregada');
  };

  const eliminarCuenta = async (id: string) => {
    await fetch(`/api/cuentas-correo?id=${id}`, { method: 'DELETE' });
    const r = await fetch('/api/cuentas-correo').then(r => r.json());
    setCuentas(r ?? []);
    toast.success('Cuenta eliminada');
  };

  const crearUsuario = async () => {
    if (!nuevoNombre.trim() || !nuevoEmail.trim() || !nuevoPassword.trim()) {
      toast.error('Nombre, email y contraseña son requeridos'); return;
    }
    setUsuarioSaving(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoNombre, email: nuevoEmail, password: nuevoPassword, rol: nuevoRol }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Usuario creado');
      setNuevoNombre(''); setNuevoEmail(''); setNuevoPassword(''); setNuevoRol('JEFE_TALLER');
      setShowNuevoUsuario(false);
      const r = await fetch('/api/usuarios').then(r => r.json());
      setUsuarios(r ?? []);
    } catch (e: any) { toast.error(e.message ?? 'Error al crear usuario'); }
    setUsuarioSaving(false);
  };

  const toggleActivo = async (u: any) => {
    try {
      await fetch('/api/usuarios', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: u.id, activo: !u.activo }),
      });
      setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, activo: !x.activo } : x));
      toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado');
    } catch { toast.error('Error'); }
  };

  const cambiarRol = async (userId: string, rol: string) => {
    try {
      await fetch('/api/usuarios', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, rol }),
      });
      setUsuarios(prev => prev.map(x => x.id === userId ? { ...x, rol } : x));
      toast.success('Rol actualizado');
    } catch { toast.error('Error'); }
  };

  const secciones = [
    { id: 'empresa' as const, label: 'Datos del Taller', icon: Building2 },
    { id: 'correo' as const, label: 'Cuentas de Correo', icon: Mail },
    { id: 'usuarios' as const, label: 'Usuarios', icon: Users },
    { id: 'mecanicos' as const, label: 'Mecánicos', icon: Wrench },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-[1000px]">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-[32px] font-extrabold text-foreground tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-2">Ajustes generales del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-secondary/20 p-1 rounded-lg">
        {secciones.map(s => (
          <button key={s.id} onClick={() => setSeccion(s.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-bold transition flex-1 justify-center ${
              seccion === s.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}>
            <s.icon className="w-4 h-4" /> {s.label}
          </button>
        ))}
      </div>

      {/* ═══ DATOS DEL TALLER ═══ */}
      {seccion === 'empresa' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Datos del Taller
            </CardTitle>
            <p className="text-muted-foreground text-sm">Estos datos aparecerán en las cotizaciones impresas y correos enviados a clientes.</p>
          </CardHeader>
          <CardContent>
            {empresaLoading ? (
              <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold">Razón Social *</Label>
                    <Input value={empresa.razonSocial ?? ''} onChange={e => setEmpresa({ ...empresa, razonSocial: e.target.value })} placeholder="Ej: Full Truck Service SPA" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">RUT Empresa</Label>
                    <Input value={empresa.rut ?? ''} onChange={e => setEmpresa({ ...empresa, rut: e.target.value })} placeholder="Ej: 76.115.891-0" className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold">Dirección</Label>
                  <Input value={empresa.direccion ?? ''} onChange={e => setEmpresa({ ...empresa, direccion: e.target.value })} placeholder="Ej: Los Nogales Poniente 33A, Lampa, RM" className="mt-1" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold">Teléfono Fijo</Label>
                    <Input value={empresa.telefono ?? ''} onChange={e => setEmpresa({ ...empresa, telefono: e.target.value })} placeholder="Ej: +569 52199926" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Celular</Label>
                    <Input value={empresa.celular ?? ''} onChange={e => setEmpresa({ ...empresa, celular: e.target.value })} placeholder="Ej: +569 12345678" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold">Email de Contacto</Label>
                    <Input value={empresa.email ?? ''} onChange={e => setEmpresa({ ...empresa, email: e.target.value })} placeholder="Ej: contacto@taller.cl" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">División / Giro</Label>
                    <Input value={empresa.division ?? ''} onChange={e => setEmpresa({ ...empresa, division: e.target.value })} placeholder="Ej: División Camiones" className="mt-1" />
                  </div>
                </div>
                <Button onClick={guardarEmpresa} disabled={empresaSaving} className="font-bold text-xs tracking-wider mt-2">
                  {empresaSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  GUARDAR DATOS
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══ CUENTAS DE CORREO ═══ */}
      {seccion === 'correo' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" /> Cuentas de Correo
            </CardTitle>
            <p className="text-muted-foreground text-sm">Cuentas desde las cuales se envían cotizaciones al cliente.</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              {cuentasLoading ? (
                <div className="text-center py-6"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
              ) : cuentas.length > 0 ? cuentas.map((c: any) => (
                <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-4 rounded-lg border border-border bg-secondary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-sm">{c.nombre}</div>
                      <div className="text-muted-foreground text-xs">{c.email}</div>
                    </div>
                    {c.predeterminada && <Badge variant="secondary" className="text-[9px] ml-2"><Star className="w-3 h-3 mr-1" /> Predeterminada</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => eliminarCuenta(c.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              )) : (
                <div className="text-center py-6 text-muted-foreground text-sm">Sin cuentas configuradas.</div>
              )}
            </div>
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <h3 className="text-xs font-bold tracking-widest text-muted-foreground mb-3">NUEVA CUENTA</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nombre (área)</Label>
                  <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Secretaría" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="Ej: secretaria@taller.cl" className="mt-1" />
                </div>
              </div>
              <Button onClick={agregarCuenta} disabled={cuentaSaving} className="mt-3 text-xs font-bold">
                {cuentaSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Agregar Cuenta
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ USUARIOS ═══ */}
      {seccion === 'usuarios' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Usuarios del Sistema
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Gestiona quién tiene acceso al sistema y con qué rol.</p>
              </div>
              <Button onClick={() => setShowNuevoUsuario(!showNuevoUsuario)} className="text-xs font-bold">
                <UserPlus className="w-4 h-4 mr-1" /> Nuevo Usuario
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Crear usuario */}
            {showNuevoUsuario && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-lg border border-primary/20 bg-primary/5 mb-6 space-y-3">
                <h3 className="text-xs font-bold tracking-widest text-muted-foreground">NUEVO USUARIO</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Nombre completo *</Label>
                    <Input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Ej: María López" className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Email *</Label>
                    <Input value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} placeholder="Ej: maria@taller.cl" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Contraseña *</Label>
                    <div className="relative mt-1">
                      <Input type={showPassword ? 'text' : 'password'} value={nuevoPassword}
                        onChange={e => setNuevoPassword(e.target.value)} placeholder="Min. 6 caracteres" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Rol</Label>
                    <select value={nuevoRol} onChange={e => setNuevoRol(e.target.value)}
                      className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                      {Object.entries(ROLES).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button onClick={crearUsuario} disabled={usuarioSaving} className="text-xs font-bold">
                    {usuarioSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                    Crear Usuario
                  </Button>
                  <Button variant="ghost" onClick={() => setShowNuevoUsuario(false)} className="text-xs">Cancelar</Button>
                </div>
              </motion.div>
            )}

            {/* Buscador de usuarios */}
            {!usuariosLoading && usuarios.length > 5 && (
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuario por nombre, email o rol..."
                  className="pl-9"
                  value={filtroUsuario}
                  onChange={(e: any) => setFiltroUsuario(e.target.value)}
                />
              </div>
            )}

            {/* Lista */}
            {usuariosLoading ? (
              <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
            ) : (
              <div className="space-y-3">
                {usuariosFiltrados.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground text-sm">No se encontraron usuarios</p>
                )}
                {usuariosFiltrados.map((u: any) => (
                  <div key={u.id}
                    className={`flex items-center justify-between p-4 rounded-lg border border-border ${u.activo ? 'bg-secondary/10' : 'bg-secondary/5 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${
                        u.activo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {u.nombre?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-sm">{u.nombre}</div>
                        <div className="text-muted-foreground text-xs">{u.email}</div>
                      </div>
                      <Badge className={`text-[9px] ml-1 ${ROLES[u.rol]?.color ?? ''}`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {ROLES[u.rol]?.label ?? u.rol}
                      </Badge>
                      {!u.activo && <Badge variant="destructive" className="text-[9px]">Inactivo</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={u.rol} onChange={e => cambiarRol(u.id, e.target.value)}
                        className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground">
                        {Object.entries(ROLES).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                      <button onClick={() => toggleActivo(u)} className="text-muted-foreground hover:text-foreground" title={u.activo ? 'Desactivar' : 'Activar'}>
                        {u.activo ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {/* ═══ MECÁNICOS ═══ */}
      {seccion === 'mecanicos' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" /> Mecánicos
            </CardTitle>
            <p className="text-muted-foreground text-sm">Los mecánicos activos aparecerán como opción al crear una OT.</p>
          </CardHeader>
          <CardContent>
            {/* Crear */}
            <div className="flex gap-3 mb-6">
              <Input value={nuevoMecanico} onChange={e => setNuevoMecanico(e.target.value)} placeholder="Nombre del mecánico" className="flex-1"
                onKeyDown={e => e.key === 'Enter' && crearMecanico()} />
              <Button onClick={crearMecanico} disabled={mecanicoSaving} className="text-xs font-bold">
                {mecanicoSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />} Agregar
              </Button>
            </div>

            {mecanicosLoading ? (
              <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
            ) : mecanicos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Sin mecánicos registrados. Agrega uno arriba.</p>
            ) : (
              <div className="space-y-2">
                {mecanicos.map((m: any) => (
                  <div key={m.id} className={`flex items-center justify-between p-3 rounded-lg border border-border ${m.activo ? 'bg-secondary/10' : 'bg-secondary/5 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black ${m.activo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {m.nombre?.charAt(0)?.toUpperCase()}
                      </div>
                      {editMecId === m.id ? (
                        <div className="flex gap-2">
                          <Input value={editMecNombre} onChange={e => setEditMecNombre(e.target.value)} className="w-48 h-8 text-sm"
                            onKeyDown={e => e.key === 'Enter' && guardarEditMecanico()} />
                          <Button size="sm" onClick={guardarEditMecanico} className="h-8 text-xs">Guardar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditMecId(null)} className="h-8 text-xs">Cancelar</Button>
                        </div>
                      ) : (
                        <span className="font-bold text-foreground text-sm">{m.nombre}</span>
                      )}
                      {!m.activo && <Badge variant="destructive" className="text-[9px]">Inactivo</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditMecId(m.id); setEditMecNombre(m.nombre); }} className="text-muted-foreground hover:text-foreground" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleMecanicoActivo(m)} className="text-muted-foreground hover:text-foreground" title={m.activo ? 'Desactivar' : 'Activar'}>
                        {m.activo ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>
                      <button onClick={() => eliminarMecanico(m.id)} className="text-muted-foreground hover:text-destructive" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
