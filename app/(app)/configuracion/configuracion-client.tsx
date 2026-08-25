'use client';

import { useEffect, useState, useMemo } from 'react';
import { validarEmail, validarTelefono, validarRut, validarRutConError, formatRutInput, formatTelefonoInput } from '@/lib/validaciones';
import { Building2, Mail, Plus, Trash2, Star, Loader2, Users, Shield, Eye, EyeOff, Save, UserPlus, ToggleLeft, ToggleRight, Wrench, Pencil, Search, X, Key, ShieldCheck, ShieldOff } from 'lucide-react';
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
  CLIENTE: { label: 'Cliente', color: 'bg-amber-500/20 text-amber-400' },
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
  // Campos extra para CLIENTE
  const [nuevoClienteRut, setNuevoClienteRut] = useState('');
  const [nuevoClienteTelefono, setNuevoClienteTelefono] = useState('');
  const [nuevoClienteTipo, setNuevoClienteTipo] = useState<'EMPRESA' | 'PERSONA'>('EMPRESA');
  const [nuevoClienteGiro, setNuevoClienteGiro] = useState('');
  const [usuarioSaving, setUsuarioSaving] = useState(false);

  // Mecánicos
  const [mecanicos, setMecanicos] = useState<any[]>([]);
  const [mecanicosLoading, setMecanicosLoading] = useState(true);
  const [mecanicoSaving, setMecanicoSaving] = useState(false);
  const [editMecId, setEditMecId] = useState<string | null>(null);
  const [editMecNombre, setEditMecNombre] = useState('');
  // Modal nuevo mecánico
  const [showMecModal, setShowMecModal] = useState(false);
  const [mecNombre, setMecNombre] = useState('');
  const [mecRut, setMecRut] = useState('');
  const [mecTelefono, setMecTelefono] = useState('');
  const [mecEmail, setMecEmail] = useState('');
  const [mecError, setMecError] = useState('');
  // Editar usuario
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUserNombre, setEditUserNombre] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserSaving, setEditUserSaving] = useState(false);
  // Eliminar usuario
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Acceso portal clientes
  const [clientesPortal, setClientesPortal] = useState<any[]>([]);
  const [clientesPortalLoading, setClientesPortalLoading] = useState(false);
  const [buscarCliente, setBuscarCliente] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any>(null);
  const [portalPassword, setPortalPassword] = useState('');
  const [showPortalPw, setShowPortalPw] = useState(false);
  const [portalSaving, setPortalSaving] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Tab activo
  const [seccion, setSeccion] = useState<'empresa' | 'correo' | 'usuarios' | 'mecanicos' | 'clientes'>('empresa');

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
    if (!mecNombre.trim()) { setMecError('Nombre requerido'); return; }
    if (mecRut.trim()) { const rutErr = validarRutConError(mecRut); if (rutErr) { setMecError(rutErr); return; } }
    if (mecTelefono.trim() && !validarTelefono(mecTelefono)) { setMecError('Teléfono inválido'); return; }
    if (mecEmail.trim() && !validarEmail(mecEmail)) { setMecError('Email inválido'); return; }
    setMecanicoSaving(true); setMecError('');
    const res = await fetch('/api/mecanicos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: mecNombre.trim(), rut: mecRut || null, telefono: mecTelefono || null, email: mecEmail || null }) });
    if (res.ok) {
      toast.success('Mecánico creado');
      setMecNombre(''); setMecRut(''); setMecTelefono(''); setMecEmail(''); setShowMecModal(false);
      await fetchMecanicos();
    } else { const d = await res.json(); setMecError(d.error || 'Error al crear mecánico'); }
    setMecanicoSaving(false);
  };

  const guardarEditUsuario = async () => {
    if (!editUserId) return;
    if (!editUserNombre.trim()) { toast.error('Nombre requerido'); return; }
    if (!validarEmail(editUserEmail)) { toast.error('Email inválido'); return; }
    setEditUserSaving(true);
    try {
      const res = await fetch('/api/usuarios', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editUserId, nombre: editUserNombre.trim(), email: editUserEmail.trim() }) });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Error al actualizar'); return; }
      setUsuarios(prev => prev.map(u => u.id === editUserId ? { ...u, nombre: editUserNombre.trim(), email: editUserEmail.trim() } : u));
      toast.success('Usuario actualizado');
      setEditUserId(null);
    } catch { toast.error('Error de conexión'); } finally { setEditUserSaving(false); }
  };

  const eliminarUsuario = async () => {
    if (!deleteUserId) return;
    setDeletingUser(true);
    try {
      const res = await fetch(`/api/usuarios?id=${deleteUserId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsuarios(prev => prev.filter(u => u.id !== deleteUserId));
        toast.success('Usuario eliminado');
      } else {
        const d = await res.json();
        toast.error(d.error || 'Error al eliminar');
      }
    } catch { toast.error('Error de conexión'); }
    setDeletingUser(false);
    setDeleteUserId(null);
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
    if (empresa.rut?.trim()) { const rutErr = validarRutConError(empresa.rut); if (rutErr) { toast.error(rutErr); return; } }
    if (empresa.telefono?.trim() && !validarTelefono(empresa.telefono)) { toast.error('Teléfono inválido — solo dígitos, 8-15 caracteres'); return; }
    if (empresa.celular?.trim() && !validarTelefono(empresa.celular)) { toast.error('Celular inválido — solo dígitos, 8-15 caracteres'); return; }
    if (empresa.email?.trim() && !validarEmail(empresa.email)) { toast.error('Email de contacto inválido'); return; }
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
    try {
      const res = await fetch('/api/cuentas-correo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, predeterminada: cuentas.length === 0 }),
      });
      if (!res.ok) { const err = await res.json(); toast.error(err.error || 'Error al agregar cuenta'); return; }
      const newCuenta = await res.json();
      setNombre(''); setEmail('');
      setCuentas(prev => [...prev, newCuenta]);
      toast.success('Cuenta agregada');
    } catch { toast.error('Error de conexión'); }
    setCuentaSaving(false);
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
    if (!validarEmail(nuevoEmail)) { toast.error('Email inválido'); return; }
    if (nuevoPassword.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    if (nuevoRol === 'CLIENTE' && !nuevoClienteRut.trim()) {
      toast.error('RUT es requerido para clientes'); return;
    }
    if (nuevoRol === 'CLIENTE') { const rutErr = validarRutConError(nuevoClienteRut); if (rutErr) { toast.error(rutErr); return; } }
    if (nuevoRol === 'CLIENTE' && nuevoClienteTipo === 'EMPRESA' && !nuevoClienteGiro.trim()) {
      toast.error('Giro es requerido para empresas'); return;
    }
    setUsuarioSaving(true);
    try {
      if (nuevoRol === 'CLIENTE') {
        const res = await fetch('/api/clientes', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipoCliente: nuevoClienteTipo,
            razonSocial: nuevoNombre.trim(),
            rut: nuevoClienteRut.trim(),
            email: nuevoEmail.trim(),
            telefono: nuevoClienteTelefono.trim() || null,
            giro: nuevoClienteGiro.trim() || null,
            password: nuevoPassword,
          }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        toast.success('Cliente creado', { description: `${nuevoNombre} fue registrado correctamente.` });
      } else {
        const res = await fetch('/api/usuarios', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: nuevoNombre, email: nuevoEmail, password: nuevoPassword, rol: nuevoRol }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
        toast.success('Usuario creado', { description: `${nuevoNombre} fue creado correctamente.` });
        const r = await fetch('/api/usuarios').then(r => r.json());
        setUsuarios(r ?? []);
      }
      setNuevoNombre(''); setNuevoEmail(''); setNuevoPassword(''); setNuevoRol('JEFE_TALLER');
      setNuevoClienteRut(''); setNuevoClienteTelefono(''); setNuevoClienteTipo('EMPRESA'); setNuevoClienteGiro('');
      setShowNuevoUsuario(false);
    } catch (e: any) { toast.error(e.message ?? 'Error al crear'); }
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

  const cargarClientesPortal = async () => {
    setClientesPortalLoading(true);
    const r = await fetch('/api/clientes').then(r => r.json()).catch(() => []);
    setClientesPortal(r ?? []);
    setClientesPortalLoading(false);
  };

  const darAccesoPortal = async () => {
    if (!clienteSeleccionado) { toast.error('Selecciona un cliente'); return; }
    if (portalPassword.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    setPortalSaving(true);
    try {
      const res = await fetch('/api/portal/admin-access', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId: clienteSeleccionado.id, password: portalPassword }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Error'); return; }
      toast.success(`Acceso portal activado. El cliente puede ingresar con su RUT y la contraseña asignada.`);
      setClienteSeleccionado(null); setPortalPassword(''); setBuscarCliente('');
      await cargarClientesPortal();
    } catch { toast.error('Error de conexión'); } finally { setPortalSaving(false); }
  };

  const revocarAcceso = async (clienteId: string) => {
    setRevokingId(clienteId);
    try {
      await fetch(`/api/portal/admin-access?clienteId=${clienteId}`, { method: 'DELETE' });
      toast.success('Acceso portal revocado');
      await cargarClientesPortal();
    } catch { toast.error('Error'); } finally { setRevokingId(null); }
  };

  const clientesPortalFiltrados = useMemo(() => {
    const q = buscarCliente.toLowerCase();
    return (clientesPortal ?? []).filter((c: any) =>
      !q || (c.razonSocial ?? '').toLowerCase().includes(q) || (c.rutEmpresa ?? '').toLowerCase().includes(q)
    );
  }, [clientesPortal, buscarCliente]);

  const secciones = [
    { id: 'empresa' as const, label: 'Datos del Taller', icon: Building2 },
    { id: 'correo' as const, label: 'Cuentas de Correo', icon: Mail },
    { id: 'usuarios' as const, label: 'Usuarios', icon: Users },
    { id: 'mecanicos' as const, label: 'Mecánicos', icon: Wrench },
    { id: 'clientes' as const, label: 'Acceso Portal', icon: Key },
  ];

  return (
    <div className="p-6 lg:p-10 max-w-[1600px]">
      <div className="mb-8">
        <h1 className="text-2xl lg:text-[32px] font-extrabold text-foreground tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-2">Ajustes generales del sistema</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-secondary/20 p-1 rounded-lg flex-wrap">
        {secciones.map(s => (
          <button key={s.id} onClick={() => { setSeccion(s.id); if (s.id === 'clientes' && clientesPortal.length === 0) cargarClientesPortal(); }}
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
                    <Input value={empresa.razonSocial ?? ''} onChange={e => setEmpresa({ ...empresa, razonSocial: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">RUT Empresa</Label>
                    <Input value={empresa.rut ?? ''} onChange={e => setEmpresa({ ...empresa, rut: formatRutInput(e.target.value) })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-bold">Dirección</Label>
                  <Input value={empresa.direccion ?? ''} onChange={e => setEmpresa({ ...empresa, direccion: e.target.value })} className="mt-1" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold">Teléfono Fijo</Label>
                    <Input value={empresa.telefono ?? ''} onChange={e => setEmpresa({ ...empresa, telefono: formatTelefonoInput(e.target.value) })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Celular</Label>
                    <Input value={empresa.celular ?? ''} onChange={e => setEmpresa({ ...empresa, celular: formatTelefonoInput(e.target.value) })} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-bold">Email de Contacto</Label>
                    <Input value={empresa.email ?? ''} onChange={e => setEmpresa({ ...empresa, email: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold">División / Giro</Label>
                    <Input value={empresa.division ?? ''} onChange={e => setEmpresa({ ...empresa, division: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <Button onClick={guardarEmpresa} disabled={empresaSaving} className="font-bold text-xs tracking-wider mt-2">
                  {empresaSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                  Guardar datos
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
                  <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Secretaría" className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="secretaria@taller.cl" className="mt-1" />
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

                {/* Rol siempre visible arriba */}
                <div>
                  <Label className="text-xs">Rol</Label>
                  <select value={nuevoRol} onChange={e => { setNuevoRol(e.target.value); }}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    {Object.entries(ROLES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>

                {nuevoRol === 'CLIENTE' ? (
                  <>
                    <div>
                      <Label className="text-xs">Tipo</Label>
                      <select value={nuevoClienteTipo} onChange={e => setNuevoClienteTipo(e.target.value as any)}
                        className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                        <option value="EMPRESA">Empresa</option>
                        <option value="PERSONA">Persona Natural</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">{nuevoClienteTipo === 'EMPRESA' ? 'Razón Social *' : 'Nombre completo *'}</Label>
                        <Input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">RUT *</Label>
                        <Input value={nuevoClienteRut} onChange={e => setNuevoClienteRut(formatRutInput(e.target.value))} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Email *</Label>
                        <Input value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Teléfono</Label>
                        <Input value={nuevoClienteTelefono} onChange={e => setNuevoClienteTelefono(e.target.value)} className="mt-1" />
                      </div>
                      {nuevoClienteTipo === 'EMPRESA' && (
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Giro *</Label>
                          <Input value={nuevoClienteGiro} onChange={e => setNuevoClienteGiro(e.target.value)} className="mt-1" />
                        </div>
                      )}
                    </div>
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
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Nombre completo *</Label>
                        <Input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Email *</Label>
                        <Input value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} className="mt-1" />
                      </div>
                    </div>
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
                  </>
                )}
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
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
                        u.activo ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {(editUserId === u.id ? editUserNombre : u.nombre)?.charAt(0)?.toUpperCase()}
                      </div>
                      {editUserId === u.id ? (
                        <div className="flex items-center gap-2 flex-1 flex-wrap">
                          <Input value={editUserNombre} onChange={e => setEditUserNombre(e.target.value)} className="h-8 text-sm w-40" placeholder="Nombre" />
                          <Input value={editUserEmail} onChange={e => setEditUserEmail(e.target.value)} className="h-8 text-sm w-48" placeholder="Email" type="email" />
                          <Button size="sm" onClick={guardarEditUsuario} disabled={editUserSaving} className="h-8 text-xs">
                            {editUserSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />} Guardar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditUserId(null)} className="h-8 text-xs">Cancelar</Button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="font-bold text-foreground text-sm">{u.nombre}</div>
                            <div className="text-muted-foreground text-xs">{u.email}</div>
                          </div>
                          <Badge className={`text-[9px] ml-1 ${ROLES[u.rol]?.color ?? ''}`}>
                            <Shield className="w-3 h-3 mr-1" />
                            {ROLES[u.rol]?.label ?? u.rol}
                          </Badge>
                          {!u.activo && <Badge variant="destructive" className="text-[9px]">Inactivo</Badge>}
                        </>
                      )}
                    </div>
                    {editUserId !== u.id && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditUserId(u.id); setEditUserNombre(u.nombre); setEditUserEmail(u.email); }} className="text-muted-foreground hover:text-foreground" title="Editar usuario">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <select value={u.rol} onChange={e => cambiarRol(u.id, e.target.value)}
                        className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground">
                        {Object.entries(ROLES).map(([key, val]) => (
                          <option key={key} value={key}>{val.label}</option>
                        ))}
                      </select>
                      <button onClick={() => toggleActivo(u)} className="text-muted-foreground hover:text-foreground" title={u.activo ? 'Desactivar' : 'Activar'}>
                        {u.activo ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>
                      <button onClick={() => setDeleteUserId(u.id)} className="text-muted-foreground hover:text-destructive" title="Eliminar usuario">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    )}
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" /> Mecánicos
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Los mecánicos activos aparecerán como opción al crear una OT.</p>
              </div>
              <Button onClick={() => { setShowMecModal(true); setMecError(''); }} className="text-xs font-bold">
                <Plus className="w-4 h-4 mr-1" /> Nuevo mecánico
              </Button>
            </div>
          </CardHeader>
          <CardContent>

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
      {/* Modal nuevo mecánico */}
      {showMecModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { if (!mecanicoSaving) setShowMecModal(false); }}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground text-lg">Nuevo mecánico</h3>
              <button onClick={() => setShowMecModal(false)} className="p-1 hover:bg-secondary rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Nombre *</Label>
                <Input value={mecNombre} onChange={e => { setMecNombre(e.target.value); setMecError(''); }} placeholder="Juan Pérez" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">RUT</Label>
                <Input value={mecRut} onChange={e => { setMecRut(formatRutInput(e.target.value)); setMecError(''); }} placeholder="12.345.678-9" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Teléfono</Label>
                <Input value={mecTelefono} onChange={e => { setMecTelefono(e.target.value); setMecError(''); }} placeholder="+56 9 1234 5678" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input value={mecEmail} onChange={e => { setMecEmail(e.target.value); setMecError(''); }} placeholder="juan@taller.cl" className="mt-1" type="email" />
              </div>
              {mecError && <p className="text-sm text-red-500">{mecError}</p>}
              <div className="flex gap-2 pt-1">
                <Button onClick={crearMecanico} disabled={mecanicoSaving} className="text-xs font-bold">
                  {mecanicoSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />} Crear mecánico
                </Button>
                <Button variant="ghost" onClick={() => setShowMecModal(false)} className="text-xs">Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ACCESO PORTAL CLIENTES ═══ */}
      {seccion === 'clientes' && (
        <div className="space-y-6">
          {/* Dar nuevo acceso */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Dar acceso al portal
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">El cliente podrá ingresar al portal con su RUT y la contraseña que asignes aquí.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Buscar cliente */}
              <div>
                <Label className="text-xs font-bold">Buscar cliente</Label>
                <Input
                  className="mt-1"
                  placeholder="Nombre o RUT"
                  value={buscarCliente}
                  onChange={e => { setBuscarCliente(e.target.value); setClienteSeleccionado(null); }}
                />
              </div>
              {/* Lista filtrada (si hay búsqueda y no hay seleccionado) */}
              {buscarCliente.length >= 2 && !clienteSeleccionado && (
                <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  {clientesPortalFiltrados.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin resultados</p>
                  ) : clientesPortalFiltrados.slice(0, 10).map((c: any) => (
                    <button key={c.id} type="button"
                      onClick={() => { setClienteSeleccionado(c); setBuscarCliente(c.razonSocial); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-secondary/50 flex items-center justify-between gap-3 border-b border-border last:border-0 transition">
                      <div>
                        <p className="text-sm font-medium">{c.razonSocial}</p>
                        <p className="text-xs text-muted-foreground">{c.rutEmpresa || c.email || '—'}</p>
                      </div>
                      {c.passwordHash && <span title="Ya tiene acceso"><ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" /></span>}
                    </button>
                  ))}
                </div>
              )}
              {/* Cliente seleccionado */}
              {clienteSeleccionado && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{clienteSeleccionado.razonSocial}</p>
                    <p className="text-xs text-muted-foreground">{clienteSeleccionado.rutEmpresa || clienteSeleccionado.email || '—'}</p>
                    {!clienteSeleccionado.email && (
                      <p className="text-xs text-amber-500 mt-1">Sin email registrado — el cliente necesita email para ingresar al portal</p>
                    )}
                  </div>
                  <button type="button" onClick={() => { setClienteSeleccionado(null); setBuscarCliente(''); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {/* Contraseña */}
              {clienteSeleccionado && (
                <div>
                  <Label className="text-xs font-bold">Contraseña de acceso</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPortalPw ? 'text' : 'password'}
                      value={portalPassword}
                      onChange={e => setPortalPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="pr-10"
                    />
                    <button type="button" onClick={() => setShowPortalPw(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPortalPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">El cliente usará su RUT y esta contraseña para entrar al portal.</p>
                </div>
              )}
              <Button onClick={darAccesoPortal} disabled={portalSaving || !clienteSeleccionado || !portalPassword}>
                {portalSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                {clienteSeleccionado?.passwordHash ? 'Actualizar contraseña' : 'Dar acceso al portal'}
              </Button>
            </CardContent>
          </Card>

          {/* Clientes con acceso activo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Clientes con acceso activo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientesPortalLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                  <Loader2 className="w-4 h-4 animate-spin" /> Cargando...
                </div>
              ) : (() => {
                const conAcceso = (clientesPortal ?? []).filter((c: any) => c.passwordHash);
                if (conAcceso.length === 0) return <p className="text-sm text-muted-foreground py-4">Ningún cliente tiene acceso al portal aún.</p>;
                return (
                  <div className="divide-y divide-border">
                    {conAcceso.map((c: any) => (
                      <div key={c.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium">{c.razonSocial}</p>
                          <p className="text-xs text-muted-foreground">{c.rutEmpresa || '—'} · {c.email || 'sin email'}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => revocarAcceso(c.id)} disabled={revokingId === c.id}
                          className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
                          {revokingId === c.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ShieldOff className="w-3 h-3 mr-1" />}
                          Revocar
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal eliminar usuario */}
      {deleteUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { if (!deletingUser) setDeleteUserId(null); }}>
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground mb-2">Eliminar usuario</h3>
            <p className="text-sm text-muted-foreground mb-4">¿Seguro que deseas eliminar este usuario? Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteUserId(null)} disabled={deletingUser}>Cancelar</Button>
              <Button variant="destructive" size="sm" onClick={eliminarUsuario} disabled={deletingUser}>
                {deletingUser ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />} Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
