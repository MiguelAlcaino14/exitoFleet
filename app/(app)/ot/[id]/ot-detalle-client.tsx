'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Truck, User, Calendar, Gauge, Fuel, FileText, Wrench, Camera, Upload, Loader2, Clock, Send, Printer, Plus, X, MessageSquare, Mail, Check, UserPlus, ClipboardCheck, Save, Trash2, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

const ESTADOS = [
  { id: 'POR_DIAGNOSTICAR', label: 'Por Diagnosticar', color: '#6366f1' },
  { id: 'EN_COTIZACION', label: 'En Cotización', color: '#f97316' },
  { id: 'ESPERANDO_APROBACION', label: 'Esp. Aprobación', color: '#eab308' },
  { id: 'EN_TRABAJO', label: 'En Trabajo', color: '#22c55e' },
  { id: 'POR_FACTURAR', label: 'Por Facturar', color: '#F4B63D' },
  { id: 'CERRADA', label: 'Cerrada', color: '#71717a' },
];

const TRANSICIONES_VALIDAS: Record<string, string[]> = {
  POR_DIAGNOSTICAR: ['EN_COTIZACION'],
  EN_COTIZACION: ['ESPERANDO_APROBACION', 'POR_DIAGNOSTICAR'],
  ESPERANDO_APROBACION: ['EN_TRABAJO', 'EN_COTIZACION'],
  EN_TRABAJO: ['POR_FACTURAR', 'ESPERANDO_APROBACION'],
  POR_FACTURAR: ['CERRADA', 'EN_TRABAJO'],
  CERRADA: ['POR_FACTURAR'],
};

const GRUPOS = [
  { key: 'REPUESTO', label: 'REPUESTOS', conCosto: true },
  { key: 'INSUMO', label: 'INSUMOS', conCosto: true },
  { key: 'SERVICIO', label: 'SERVICIOS', conCosto: true },
  { key: 'MANO_DE_OBRA', label: 'MANO DE OBRA', conCosto: false },
  { key: 'DESCUENTO', label: 'DESCUENTOS', conCosto: false },
];

function formatCLP(v: number) { return '$' + Math.round(v ?? 0).toLocaleString('es-CL'); }
function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function formatDateTime(d: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', timeZone: 'UTC' }) + ', ' + dt.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}
function calcVenta(costo: number, margen: number) {
  const c = costo || 0;
  const m = margen || 0;
  if (m >= 100) return c;
  return m > 0 ? Math.round(c / (1 - m / 100)) : c;
}
function diasDesde(fecha: string | null): number {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000);
}

export function OTDetalleClient({ otId }: { otId: string }) {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role ?? '';
  const puedeLiberar = userRole === 'ADMIN' || userRole === 'JEFE_TALLER' || userRole === 'SUPER_ADMIN';

  const [ot, setOt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('historial');
  const [saving, setSaving] = useState(false);

  // Timeline
  const [eventos, setEventos] = useState<any[]>([]);
  const [notaTexto, setNotaTexto] = useState('');

  // Valorización
  const [items, setItems] = useState<any[]>([]);
  const [tipoNuevo, setTipoNuevo] = useState('REPUESTO');
  const [descNuevo, setDescNuevo] = useState('');
  const [cantNuevo, setCantNuevo] = useState('1');
  const [costoNuevo, setCostoNuevo] = useState('');
  const [margenNuevo, setMargenNuevo] = useState('30');
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [showSug, setShowSug] = useState(false);

  // Diagnóstico
  const [diagnostico, setDiagnostico] = useState('');

  // Edición de items
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItemData, setEditItemData] = useState<any>({});

  // Mecánicos
  const [mecanicos, setMecanicos] = useState<any[]>([]);
  const [editMecanico, setEditMecanico] = useState(false);
  const [nuevoMecanicoId, setNuevoMecanicoId] = useState('');
  const [savingMecanico, setSavingMecanico] = useState(false);
  const [showCrearMecInline, setShowCrearMecInline] = useState(false);
  const [mecNombreInline, setMecNombreInline] = useState('');
  const [creandoMecInline, setCreandoMecInline] = useState(false);

  // Fotos
  const [fotos, setFotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // Datos empresa
  const [configTaller, setConfigTaller] = useState<any>(null);

  // Checklist
  const [checklist, setChecklist] = useState<any>({
    gato: false, llaveRuedas: false, ruedaRepuesto: false, triangulos: false,
    extintor: false, botiquin: false, documentos: false,
    estadoCarroceria: '', nivelAceite: '', nivelLiquidoFrenos: '', observaciones: '',
  });
  const [checklistSaving, setChecklistSaving] = useState(false);

  // Modal enviar cotización
  const [showEnviar, setShowEnviar] = useState(false);
  const [cuentasCorreo, setCuentasCorreo] = useState<any[]>([]);
  const [contactos, setContactos] = useState<any[]>([]);
  const [cuentaSeleccionada, setCuentaSeleccionada] = useState('');
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [emailManual, setEmailManual] = useState('');
  const [nuevoContactoNombre, setNuevoContactoNombre] = useState('');
  const [nuevoContactoEmail, setNuevoContactoEmail] = useState('');
  const [nuevoContactoCargo, setNuevoContactoCargo] = useState('');
  const [showNuevoContacto, setShowNuevoContacto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const fetchFotos = useCallback(() => {
    if (!otId) return;
    fetch(`/api/ordenes/${otId}/fotos`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setFotos(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [otId]);

  const fetchOT = useCallback(() => {
    if (!otId) return;
    fetch(`/api/ordenes/${otId}`)
      .then((r) => {
        if (!r.ok) throw new Error('not_found');
        return r.json();
      })
      .then((d) => {
        setOt(d);
        setDiagnostico(d?.diagnosticoMecanico ?? '');
        setLoading(false);
        fetchFotos();
      })
      .catch(() => setLoading(false));
  }, [otId, fetchFotos]);

  const fetchTimeline = useCallback(() => {
    fetch(`/api/ordenes/${otId}/timeline`).then(r => r.json()).then(d => setEventos(d ?? []));
  }, [otId]);

  const fetchItems = useCallback(() => {
    fetch(`/api/ordenes/${otId}/items`).then(r => r.json()).then(d => setItems(d ?? []));
  }, [otId]);

  const fetchChecklist = useCallback(() => {
    fetch(`/api/ordenes/${otId}/checklist`).then(r => r.json()).then(d => { if (d) setChecklist(d); });
  }, [otId]);

  useEffect(() => {
    fetchOT(); fetchTimeline(); fetchItems(); fetchChecklist();
    fetch('/api/configuracion-taller').then(r => r.json()).then(d => setConfigTaller(d)).catch(() => {});
    fetch('/api/mecanicos?activos=true').then(r => r.json()).then(d => setMecanicos(d ?? [])).catch(() => {});
    fetch('/api/items/sugerencias').then(r => r.json()).then(d => setSugerencias(Array.isArray(d) ? d : [])).catch(() => {});
  }, [fetchOT, fetchTimeline, fetchItems, fetchChecklist]);

  const guardarChecklist = async () => {
    setChecklistSaving(true);
    try {
      const res = await fetch(`/api/ordenes/${otId}/checklist`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checklist),
      });
      if (!res.ok) throw new Error();
      toast.success('Checklist guardado');
    } catch { toast.error('Error al guardar checklist'); }
    setChecklistSaving(false);
  };

  // Cargar datos para modal enviar
  const abrirModalEnviar = async () => {
    const clienteId = ot?.vehiculo?.cliente?.id;
    try {
      const [resCuentas, resContactos] = await Promise.all([
        fetch('/api/cuentas-correo').then(r => r.json()),
        clienteId ? fetch(`/api/clientes/${clienteId}/contactos`).then(r => r.json()) : Promise.resolve([]),
      ]);
      const cuentas = Array.isArray(resCuentas) ? resCuentas : (resCuentas?.cuentas ?? []);
      setCuentasCorreo(cuentas);
      setContactos(Array.isArray(resContactos) ? resContactos : (resContactos?.contactos ?? []));
      if (cuentas.length > 0) {
        const pred = cuentas.find((c: any) => c.predeterminada);
        setCuentaSeleccionada(pred?.id ?? cuentas[0].id);
      }
      setDestinatarios([]);
      setEmailManual('');
      setShowNuevoContacto(false);
      setShowEnviar(true);
    } catch { toast.error('Error cargando datos'); }
  };

  const toggleDestinatario = (email: string) => {
    setDestinatarios(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]);
  };

  const agregarContacto = async () => {
    const clienteId = ot?.vehiculo?.cliente?.id;
    if (!clienteId || !nuevoContactoEmail.trim() || !nuevoContactoNombre.trim()) return;
    try {
      const res = await fetch(`/api/clientes/${clienteId}/contactos`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevoContactoNombre, email: nuevoContactoEmail, cargo: nuevoContactoCargo }),
      });
      if (!res.ok) throw new Error();
      const nuevo = await res.json();
      setContactos(prev => [...prev, nuevo]);
      setDestinatarios(prev => [...prev, nuevo.email]);
      setNuevoContactoNombre('');
      setNuevoContactoEmail('');
      setNuevoContactoCargo('');
      setShowNuevoContacto(false);
      toast.success('Contacto agregado');
    } catch { toast.error('Error al guardar contacto'); }
  };

  const enviarCotizacion = async () => {
    const allDest = [...destinatarios];
    if (emailManual.trim()) allDest.push(emailManual.trim());
    if (allDest.length === 0) { toast.error('Selecciona al menos un destinatario'); return; }
    if (!cuentaSeleccionada) { toast.error('Selecciona una cuenta remitente'); return; }
    if (totalGeneral <= 0) { toast.error('El total de la cotización debe ser mayor a $0 antes de enviar'); return; }
    setEnviando(true);
    try {
      const res = await fetch(`/api/ordenes/${otId}/enviar-cotizacion`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuentaCorreoId: cuentaSeleccionada, destinatarios: allDest }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error ?? 'Error'); }
      toast.success('Cotización enviada exitosamente');
      setShowEnviar(false);
      fetchTimeline();
    } catch (e: any) { toast.error(e.message ?? 'Error al enviar'); }
    finally { setEnviando(false); }
  };

  const estadoActual = ESTADOS.find(e => e.id === ot?.estado);
  const dias = diasDesde(ot?.fechaIngreso);
  const patente = ot?.vehiculo?.patente ?? '';
  const vehiculoDesc = [ot?.vehiculo?.marca, ot?.vehiculo?.modelo].filter(Boolean).join(' ') || 'Sin datos';
  const cliente = ot?.vehiculo?.cliente?.razonSocial ?? '';
  const otNum = String(ot?.otNumero ?? '').padStart(4, '0');

  const guardarNota = async () => {
    if (!notaTexto.trim()) return;
    await fetch(`/api/ordenes/${otId}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'NOTA DE SEGUIMIENTO', descripcion: notaTexto, tipoEvento: 'nota' }),
    });
    setNotaTexto('');
    fetchTimeline();
    toast.success('Nota guardada');
  };

  const guardarDiagnostico = async () => {
    if (!diagnostico?.trim()) { toast.error('Escribe el diagnóstico antes de guardar'); return; }
    setSaving(true);
    const payload: any = { diagnosticoMecanico: diagnostico };
    // Auto-advance: if currently POR_DIAGNOSTICAR, move to EN_COTIZACION
    if (ot?.estado === 'POR_DIAGNOSTICAR') {
      payload.estado = 'EN_COTIZACION';
    }
    const res = await fetch(`/api/ordenes/${otId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const updated = await res.json();
      setOt(updated);
      if (payload.estado) {
        toast.success('Diagnóstico guardado — OT avanzó a En Cotización');
      } else {
        toast.success('Diagnóstico guardado');
      }
    } else {
      toast.error('Error al guardar diagnóstico');
    }
    setSaving(false);
  };

  const cambiarMecanico = async () => {
    if (!nuevoMecanicoId) return;
    setSavingMecanico(true);
    try {
      await fetch(`/api/ordenes/${otId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mecanicoId: nuevoMecanicoId }),
      });
      const mec = mecanicos.find((m: any) => m.id === nuevoMecanicoId);
      await fetch(`/api/ordenes/${otId}/timeline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: `MECÁNICO CAMBIADO A: ${mec?.nombre?.toUpperCase() ?? ''}`, tipoEvento: 'nota' }),
      });
      fetchOT(); fetchTimeline();
      setEditMecanico(false);
      toast.success('Mecánico actualizado');
    } catch { toast.error('Error al cambiar mecánico'); }
    setSavingMecanico(false);
  };

  const crearMecanicoInline = async () => {
    if (!mecNombreInline.trim()) return;
    setCreandoMecInline(true);
    try {
      const res = await fetch('/api/mecanicos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: mecNombreInline.trim() }) });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || 'Error al crear mecánico'); return; }
      setMecanicos(prev => [...prev, d]);
      setNuevoMecanicoId(d.id);
      setShowCrearMecInline(false);
      setMecNombreInline('');
      toast.success('Mecánico creado');
    } catch { toast.error('Error'); } finally { setCreandoMecInline(false); }
  };

  const cambiarEstado = async (nuevoEstado: string) => {
    setSaving(true);
    const estadoLabel = ESTADOS.find(e => e.id === nuevoEstado)?.label ?? nuevoEstado;
    await fetch(`/api/ordenes/${otId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    await fetch(`/api/ordenes/${otId}/timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: `ESTADO CAMBIADO A: ${estadoLabel.toUpperCase()}`, tipoEvento: 'estado' }),
    });
    fetchOT();
    fetchTimeline();
    setSaving(false);
    toast.success(`Estado cambiado a ${estadoLabel}`);
  };



  // Valorización functions
  const agregarItem = async () => {
    if (!descNuevo.trim()) return;
    const costo = parseFloat(costoNuevo) || 0;
    const margen = parseFloat(margenNuevo) || 0;
    if (costo < 0) { toast.error('El costo no puede ser negativo'); return; }
    if (margen >= 100) { toast.error('El margen no puede ser 100% o más'); return; }
    const venta = (tipoNuevo === 'MANO_DE_OBRA' || tipoNuevo === 'DESCUENTO') ? costo : calcVenta(costo, margen);
    if (venta < 0) { toast.error('El precio de venta resultante no puede ser negativo'); return; }
    await fetch(`/api/ordenes/${otId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: tipoNuevo,
        descripcion: descNuevo,
        cantidad: parseFloat(cantNuevo) || 1,
        costoUnitario: costo,
        margen: margen,
        precioVenta: venta,
      }),
    });
    setDescNuevo(''); setCantNuevo('1'); setCostoNuevo(''); setMargenNuevo('30');
    fetchItems();
    fetchOT();
    // Refrescar memoria de descripciones para el autocompletado
    fetch('/api/items/sugerencias').then(r => r.json()).then(d => setSugerencias(Array.isArray(d) ? d : [])).catch(() => {});
  };

  const eliminarItem = async (itemId: string) => {
    await fetch(`/api/ordenes/${otId}/items?itemId=${itemId}`, { method: 'DELETE' });
    fetchItems();
    fetchOT();
  };

  const startEditItem = (item: any) => {
    setEditItemId(item.id);
    setEditItemData({ descripcion: item.descripcion, cantidad: item.cantidad, costoUnitario: item.costoUnitario, margen: item.margen, precioVenta: item.precioVenta, tipo: item.tipo });
  };

  const guardarEditItem = async () => {
    if (!editItemId) return;
    const costo = parseFloat(editItemData.costoUnitario) || 0;
    const margen = parseFloat(editItemData.margen) || 0;
    if (costo < 0) { toast.error('El costo no puede ser negativo'); return; }
    if (margen >= 100) { toast.error('El margen no puede ser 100% o más'); return; }
    const venta = (editItemData.tipo === 'MANO_DE_OBRA' || editItemData.tipo === 'DESCUENTO') ? costo : calcVenta(costo, margen);
    if (venta < 0) { toast.error('El precio de venta resultante no puede ser negativo'); return; }
    await fetch(`/api/ordenes/${otId}/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: editItemId, descripcion: editItemData.descripcion, cantidad: editItemData.cantidad, costoUnitario: costo, margen, precioVenta: venta }),
    });
    setEditItemId(null);
    fetchItems();
    fetchOT();
  };

  const totalGrupo = (key: string) =>
    items.filter((i: any) => i.tipo === key)
      .reduce((a: number, i: any) => a + (i.precioVenta || 0) * (i.cantidad || 1), 0);
  const totalGeneral = items.reduce((a: number, i: any) => a + (i.precioVenta || 0) * (i.cantidad || 1), 0);
  const totalCosto = items.reduce((a: number, i: any) => a + (i.costoUnitario || 0) * (i.cantidad || 1), 0);
  const margenGlobal = totalGeneral > 0 ? ((totalGeneral - totalCosto) / totalGeneral * 100) : 0;

  // Photo upload
  const handleUploadFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setUploadPreview(localUrl);
    setUploading(true);
    try {
      const presignedRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: true }),
      });
      const { uploadUrl, cloud_storage_path, headers: uploadHeaders } = await presignedRes.json();
      const hdrs: Record<string, string> = { 'Content-Type': file.type };
      if (uploadHeaders) Object.assign(hdrs, uploadHeaders);
      await fetch(uploadUrl, { method: 'PUT', headers: hdrs, body: file });
      await fetch(`/api/ordenes/${otId}/fotos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cloud_storage_path, contentType: file.type, fileName: file.name, isPublic: true }),
      });
      fetchFotos();
      toast.success('Foto subida');
    } catch {
      toast.error('Error al subir foto');
    }
    setUploading(false);
    URL.revokeObjectURL(localUrl);
    setUploadPreview(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  );
  if (!ot) return (
    <div className="p-10 text-center"><p className="text-muted-foreground">OT no encontrada</p></div>
  );

  const tabs = ['Historial', 'Valorización', 'Recepción', 'Fotos'];

  const fechaHoy = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
  const horaHoy = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });

  return (
    <div className="p-6 lg:p-8">

      {/* ═══ VISTA IMPRESIÓN: COTIZACIÓN PROFESIONAL ═══ */}
      <div className="print-only" style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#000', background: '#fff', padding: '20px 30px', fontSize: '11pt' }}>
        {/* Encabezado empresa */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <h1 style={{ fontSize: '18pt', fontWeight: 'bold', margin: 0 }}>{configTaller?.razonSocial || 'D Motor'}</h1>
            {configTaller?.direccion && <p style={{ margin: '2px 0', fontSize: '9pt', color: '#555' }}>{configTaller.direccion}</p>}
            {configTaller?.rut && <p style={{ margin: '1px 0', fontSize: '9pt', color: '#555' }}>RUT: {configTaller.rut}{configTaller.telefono ? ` / Fono: ${configTaller.telefono}` : ''}</p>}
            {configTaller?.division && <p style={{ margin: '1px 0', fontSize: '9pt', color: '#555' }}>{configTaller.division}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '16pt', fontWeight: 'bold', margin: 0 }}>Cotización #{otNum}</h2>
            <p style={{ margin: '2px 0', fontSize: '9pt', color: '#555' }}>Impresión: {fechaHoy} a las {horaHoy}</p>
          </div>
        </div>
        <hr style={{ border: 'none', borderTop: '2px solid #000', margin: '8px 0 12px' }} />

        {/* Datos cliente + vehículo */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '14px' }}>
          <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: '9.5pt' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: 'bold', background: '#f5f5f5', width: '80px' }}>Cliente:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{cliente}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: 'bold', background: '#f5f5f5' }}>RUT:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{ot?.vehiculo?.cliente?.rutEmpresa ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: 'bold', background: '#f5f5f5' }}>Dirección:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{ot?.vehiculo?.cliente?.direccion ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: 'bold', background: '#f5f5f5' }}>Teléfono:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{ot?.vehiculo?.cliente?.telefono ?? '—'}</td>
              </tr>
            </tbody>
          </table>
          <table style={{ flex: 1, borderCollapse: 'collapse', fontSize: '9.5pt' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: 'bold', background: '#f5f5f5', width: '80px' }}>Patente:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: 'bold' }}>{patente}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: 'bold', background: '#f5f5f5', width: '60px' }}>Año:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{ot?.vehiculo?.anio ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: 'bold', background: '#f5f5f5' }}>Marca:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{ot?.vehiculo?.marca ?? '—'}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: 'bold', background: '#f5f5f5' }}>Modelo:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{ot?.vehiculo?.modelo ?? '—'}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: 'bold', background: '#f5f5f5' }}>Tipo:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{ot?.vehiculo?.tipoVehiculo ?? '—'}</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontWeight: 'bold', background: '#f5f5f5' }}>Km:</td>
                <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{ot?.kilometraje?.toLocaleString('es-CL') ?? '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Fechas */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', marginBottom: '14px', color: '#555' }}>
          <span>Recepción: {formatDate(ot?.fechaIngreso)}</span>
        </div>

        {/* Motivo / Trabajos */}
        {ot?.motivoIngreso && (
          <div style={{ border: '1px solid #ccc', padding: '8px 12px', marginBottom: '14px', fontSize: '9.5pt' }}>
            <p style={{ fontWeight: 'bold', margin: '0 0 4px', fontSize: '10pt' }}>TRABAJOS</p>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{ot.motivoIngreso}</p>
          </div>
        )}

        {/* Tabla de ítems */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: '0' }}>
          <thead>
            <tr style={{ background: '#e8e8e8' }}>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'left' }}>Descripción</th>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'center', width: '60px' }}>Ctdad</th>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right', width: '100px' }}>$ Unitario</th>
              <th style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right', width: '100px' }}>$ Total</th>
            </tr>
          </thead>
          <tbody>
            {GRUPOS.map(grupo => {
              const lineas = items.filter((i: any) => i.tipo === grupo.key);
              if (lineas.length === 0) return null;
              return (
                <React.Fragment key={grupo.key}>
                  <tr>
                    <td colSpan={4} style={{ border: '1px solid #ccc', padding: '5px 8px', fontWeight: 'bold', background: '#f0f0f0', fontSize: '9pt' }}>
                      {grupo.label}
                    </td>
                  </tr>
                  {lineas.map((item: any) => {
                    const total = Math.round((item.precioVenta || 0) * (item.cantidad || 1));
                    const esDesc = item.tipo === 'DESCUENTO';
                    return (
                      <tr key={item.id}>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px' }}>{item.descripcion}</td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'center' }}>{item.cantidad}</td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'right' }}>{formatCLP(item.precioVenta)}</td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', textAlign: 'right', fontWeight: '600' }}>
                          {esDesc ? `-${formatCLP(Math.abs(total))}` : formatCLP(total)}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Totales */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginTop: '-1px' }}>
          <tbody>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', fontWeight: 'bold', background: '#f0f0f0' }}>Valores + IVA</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold', width: '100px' }}>NETO</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold', width: '120px' }}>{formatCLP(totalGeneral)}</td>
            </tr>
            <tr>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px' }}></td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>IVA 19%</td>
              <td style={{ border: '1px solid #ccc', padding: '5px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCLP(totalGeneral * 0.19)}</td>
            </tr>
            <tr style={{ background: '#e8e8e8' }}>
              <td style={{ border: '1px solid #ccc', padding: '6px 8px' }}></td>
              <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '11pt' }}>TOTAL</td>
              <td style={{ border: '1px solid #ccc', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '12pt' }}>{formatCLP(totalGeneral * 1.19)}</td>
            </tr>
          </tbody>
        </table>

        <p style={{ fontSize: '8pt', color: '#888', marginTop: '20px', textAlign: 'center' }}>Documento generado por D Motor · Cotización sujeta a disponibilidad de repuestos</p>
      </div>

      {/* ═══ CONTENIDO EN PANTALLA ═══ */}
      <div className="screen-only">
      {/* TOP HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start gap-4 mb-6 pb-6 border-b border-border">
        <div className="flex gap-4 items-center">
          <Link href="/kanban">
            <Button variant="ghost" size="icon" className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="bg-card p-3 rounded-lg flex flex-col items-center justify-center border-2 border-primary min-w-[80px]">
            <span className="text-[10px] font-black tracking-widest text-primary">OT</span>
            <span className="text-2xl font-black text-foreground">{ot?.otNumero}</span>
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-foreground tracking-tight">
              {patente} <span className="text-muted-foreground font-normal text-lg">· {vehiculoDesc}</span>
            </h1>
            <div className="flex flex-wrap gap-4 mt-1 text-sm">
              <span className="text-muted-foreground flex items-center gap-1"><User className="w-3.5 h-3.5" /> {cliente}</span>
              <span className="text-muted-foreground flex items-center gap-1"><Gauge className="w-3.5 h-3.5" /> {ot?.kilometraje?.toLocaleString('es-CL') ?? '—'} km</span>
              <span className="flex items-center gap-1.5 font-bold" style={{ color: estadoActual?.color }}>
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: estadoActual?.color }} />
                {estadoActual?.label?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 print:hidden items-center">
          <select value={ot?.estado ?? ''} onChange={(e) => cambiarEstado(e.target.value)} disabled={saving}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold text-foreground">
            {ESTADOS.filter(e =>
              puedeLiberar
                ? true
                : e.id === ot?.estado || (TRANSICIONES_VALIDAS[ot?.estado ?? ''] ?? []).includes(e.id)
            ).map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
          {saving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        </div>
      </div>

      {/* MAIN LAYOUT: TABS + SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: TABS */}
        <div className="lg:col-span-8">
          {/* Tab buttons */}
          <div className="flex gap-1 mb-4">
            {tabs.map(t => (
              <button key={t} onClick={() => setTab(t.toLowerCase())}
                className={`px-5 py-3 text-xs font-bold tracking-widest uppercase transition-all rounded-t-md border-b-2 ${
                  tab === t.toLowerCase()
                    ? 'bg-card border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                {t}
              </button>
            ))}
          </div>

          <Card className="rounded-t-none">
            <CardContent className="p-5">
              {/* ═══ HISTORIAL TAB ═══ */}
              {tab === 'historial' && (
                <div>
                  {/* Add note bar */}
                  <div className="flex gap-3 mb-6 p-3 bg-secondary/20 rounded-lg border border-border">
                    <Input value={notaTexto} onChange={(e) => setNotaTexto(e.target.value)}
                      placeholder="Escribe un comentario o nota interna sobre esta OT"
                      onKeyDown={(e) => e.key === 'Enter' && guardarNota()} className="flex-1" />
                    <Button variant="outline" size="sm" onClick={guardarNota} className="text-xs text-primary border-primary hover:bg-primary hover:text-primary-foreground">
                      <MessageSquare className="w-3 h-3 mr-1" /> Guardar Nota
                    </Button>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-5 relative before:content-[''] before:absolute before:left-[7px] before:top-0 before:w-[1px] before:h-full before:bg-border">
                    {eventos.map((ev: any) => (
                      <motion.div key={ev.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="relative pl-8">
                        <div className="absolute left-0 w-4 h-4 rounded-full bg-card border border-muted-foreground/30 flex items-center justify-center z-10 mt-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${ev.tipoEvento === 'estado' ? 'bg-primary' : ev.tipoEvento === 'alerta' ? 'bg-destructive' : 'bg-muted-foreground'}`} />
                        </div>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-xs font-black tracking-widest uppercase text-foreground">{ev.titulo}</h4>
                          <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap ml-4">
                            {formatDateTime(ev.createdAt)} · {ev.usuario ?? 'Sistema'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{ev.descripcion}</p>
                      </motion.div>
                    ))}
                    {eventos.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Sin eventos registrados aún</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ═══ VALORIZACIÓN TAB ═══ */}
              {tab === 'valorización' && (
                <div>
                  {/* Mecánico Responsable */}
                  <div className="mb-6 p-4 bg-secondary/30 rounded-lg border border-border space-y-3">
                    <div className="flex items-center gap-4">
                      <label className="text-[10px] font-black tracking-widest text-muted-foreground whitespace-nowrap">MECÁNICO RESPONSABLE</label>
                      <select
                        value={ot?.mecanicoId ?? ''}
                        onChange={async (e) => {
                          if (e.target.value === '__nuevo__') { setShowCrearMecInline(true); return; }
                          const val = e.target.value || null;
                          const res = await fetch(`/api/ordenes/${otId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mecanicoId: val }) });
                          if (res.ok) fetchOT();
                        }}
                        className="bg-background border border-border rounded px-3 py-2 text-sm text-foreground flex-1 max-w-[280px]">
                        <option value="">— Sin asignar —</option>
                        {mecanicos.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        <option value="__nuevo__">+ Agregar mecánico</option>
                      </select>
                    </div>
                    {showCrearMecInline && (
                      <div className="p-2 border border-primary/30 rounded-lg bg-primary/5 space-y-1.5">
                        <input value={mecNombreInline} onChange={e => setMecNombreInline(e.target.value)}
                          placeholder="Nombre del mecánico"
                          className="w-full h-7 text-xs bg-background border border-border rounded px-2 text-foreground"
                          onKeyDown={async (e: any) => { if (e.key === 'Enter') { await crearMecanicoInline(); } }} />
                        <div className="flex gap-1">
                          <button onClick={crearMecanicoInline} disabled={creandoMecInline || !mecNombreInline.trim()}
                            className="text-xs bg-primary text-white px-2 py-1 rounded disabled:opacity-50">
                            {creandoMecInline ? 'Creando...' : 'Crear'}
                          </button>
                          <button onClick={() => { setShowCrearMecInline(false); setMecNombreInline(''); }}
                            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded">
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Diagnóstico */}
                  <div className="mb-6 p-4 bg-secondary/30 rounded-lg border border-border">
                    <label className="block text-[10px] font-black tracking-widest text-muted-foreground mb-2">DIAGNÓSTICO TÉCNICO</label>
                    <Textarea value={diagnostico} onChange={(e) => setDiagnostico(e.target.value)}
                      placeholder="Describe el diagnóstico del mecánico" className="min-h-[60px] mb-2" />
                    <div className="flex items-center gap-3">
                      <Button size="sm" onClick={guardarDiagnostico} disabled={saving} className="text-xs bg-primary hover:bg-primary/90">
                        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <FileText className="w-3 h-3 mr-1" />} Guardar Diagnóstico
                      </Button>
                      {ot?.estado === 'POR_DIAGNOSTICAR' && (
                        <span className="text-[10px] text-primary font-semibold">→ Avanzará a En Cotización</span>
                      )}
                    </div>
                  </div>

                  {/* Barra agregar */}
                  <div className="p-4 mb-5 bg-secondary/20 rounded-lg border border-primary/20 flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black tracking-widest text-muted-foreground">TIPO</label>
                      <select value={tipoNuevo} onChange={(e) => setTipoNuevo(e.target.value)}
                        className="bg-background border border-border rounded px-3 py-2 text-sm text-foreground w-[140px]">
                        {GRUPOS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[150px] relative">
                      <label className="text-[9px] font-black tracking-widest text-muted-foreground">DESCRIPCIÓN</label>
                      <Input value={descNuevo}
                        onChange={(e) => { setDescNuevo(e.target.value); setShowSug(true); }}
                        onFocus={() => setShowSug(true)}
                        onBlur={() => setTimeout(() => setShowSug(false), 150)}
                        placeholder="Filtro de aire, cambio de aceite" onKeyDown={(e) => e.key === 'Enter' && agregarItem()} />
                      {showSug && descNuevo.trim().length >= 1 && (() => {
                        const q = descNuevo.trim().toLowerCase();
                        const matches = sugerencias.filter((s: any) =>
                          (s?.descripcion ?? '').toLowerCase().includes(q) &&
                          (s?.descripcion ?? '').toLowerCase() !== q
                        ).slice(0, 8);
                        if (matches.length === 0) return null;
                        return (
                          <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl max-h-64 overflow-y-auto">
                            {matches.map((s: any, idx: number) => (
                              <button
                                key={idx}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setDescNuevo(s.descripcion);
                                  setTipoNuevo(s.tipo ?? 'REPUESTO');
                                  if (s.costoUnitario != null) setCostoNuevo(String(s.costoUnitario));
                                  if (s.margen != null) setMargenNuevo(String(s.margen));
                                  setShowSug(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-secondary/40 transition flex items-center justify-between gap-2 border-b border-border/50 last:border-0"
                              >
                                <span className="text-sm text-foreground truncate">{s.descripcion}</span>
                                {s.costoUnitario ? (
                                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">${Math.round(s.costoUnitario).toLocaleString('es-CL')}</span>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black tracking-widest text-muted-foreground">CTDAD</label>
                      <Input type="number" value={cantNuevo} onChange={(e) => setCantNuevo(e.target.value)} className="w-[65px] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black tracking-widest text-muted-foreground">$ COSTO</label>
                      <Input type="number" value={costoNuevo} onChange={(e) => setCostoNuevo(e.target.value)} placeholder="0" className="w-[100px] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black tracking-widest text-muted-foreground">% MARGEN</label>
                      <Input type="number" value={margenNuevo} onChange={(e) => setMargenNuevo(e.target.value)} className="w-[70px] text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    </div>
                    <Button onClick={agregarItem} className="font-bold text-xs h-9">
                      <Plus className="w-4 h-4 mr-1" /> Agregar
                    </Button>
                  </div>

                  {/* Tabla agrupada */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    {/* Header */}
                    <div className="grid grid-cols-[1fr_60px_100px_80px_100px_100px_52px] bg-secondary/30 px-3 py-2 border-b border-border">
                      {['DESCRIPCIÓN', 'CTDAD', '$ COSTO', '% MRG', '$ VENTA', '$ TOTAL', ''].map((h, i) => (
                        <div key={i} className={`text-[10px] font-black tracking-wider text-muted-foreground ${i >= 2 && i <= 5 ? 'text-right' : ''}`}>{h}</div>
                      ))}
                    </div>

                    {GRUPOS.map(grupo => {
                      const lineas = items.filter((i: any) => i.tipo === grupo.key);
                      if (lineas.length === 0) return null;
                      const subtotal = totalGrupo(grupo.key);
                      return (
                        <div key={grupo.key}>
                          <div className="px-3 py-2 bg-secondary/20 border-b border-t border-border">
                            <span className="text-[11px] font-black tracking-widest text-primary">{grupo.label}</span>
                          </div>
                          {lineas.map((item: any, idx: number) => {
                            const totalItem = Math.round((item.precioVenta || 0) * (item.cantidad || 1));
                            const esDesc = item.tipo === 'DESCUENTO';
                            const esMO = item.tipo === 'MANO_DE_OBRA';
                            const enEdicion = editItemId === item.id;
                            if (enEdicion) {
                              return (
                                <div key={item.id} className="px-3 py-3 border-b border-border bg-primary/5">
                                  <div className="flex flex-wrap gap-2 items-end">
                                    <div className="flex-1 min-w-[140px]">
                                      <label className="text-[9px] font-bold text-muted-foreground">DESCRIPCIÓN</label>
                                      <Input value={editItemData.descripcion} onChange={e => setEditItemData((p: any) => ({ ...p, descripcion: e.target.value }))} className="h-7 text-xs mt-0.5" />
                                    </div>
                                    <div>
                                      <label className="text-[9px] font-bold text-muted-foreground">CTDAD</label>
                                      <Input type="number" value={editItemData.cantidad} onChange={e => setEditItemData((p: any) => ({ ...p, cantidad: e.target.value }))} className="h-7 text-xs w-16 mt-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                    </div>
                                    {!esMO && !esDesc && <>
                                      <div>
                                        <label className="text-[9px] font-bold text-muted-foreground">$ COSTO</label>
                                        <Input type="number" value={editItemData.costoUnitario} onChange={e => setEditItemData((p: any) => ({ ...p, costoUnitario: e.target.value }))} className="h-7 text-xs w-24 mt-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                      </div>
                                      <div>
                                        <label className="text-[9px] font-bold text-muted-foreground">% MRG</label>
                                        <Input type="number" value={editItemData.margen} onChange={e => setEditItemData((p: any) => ({ ...p, margen: e.target.value }))} className="h-7 text-xs w-16 mt-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                      </div>
                                    </>}
                                    <Button size="sm" className="h-7 text-xs" onClick={guardarEditItem}><Check className="w-3.5 h-3.5 mr-1" /> Guardar</Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditItemId(null)}>Cancelar</Button>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div key={item.id} className={`grid grid-cols-[1fr_60px_100px_80px_100px_100px_52px] px-3 py-2 border-b border-border items-center ${idx % 2 === 0 ? 'bg-background' : 'bg-secondary/10'}`}>
                                <span className="text-sm text-foreground truncate">{item.descripcion}</span>
                                <span className="text-sm text-center text-muted-foreground">{item.cantidad}</span>
                                <span className="text-sm text-right text-muted-foreground">{esMO || esDesc ? '—' : formatCLP(item.costoUnitario)}</span>
                                <span className="text-sm text-right text-muted-foreground">{esMO || esDesc ? '—' : `${item.margen}%`}</span>
                                <span className="text-sm text-right text-foreground">{formatCLP(item.precioVenta)}</span>
                                <span className={`text-sm text-right font-semibold ${esDesc ? 'text-destructive' : 'text-foreground'}`}>
                                  {esDesc ? `-${formatCLP(Math.abs(totalItem))}` : formatCLP(totalItem)}
                                </span>
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => startEditItem(item)} title="Editar" className="text-muted-foreground hover:text-primary transition-colors">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => eliminarItem(item.id)} title="Eliminar" className="text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          <div className="grid grid-cols-[1fr_60px_100px_80px_100px_100px_52px] px-3 py-2 bg-secondary/20 border-b-2 border-border">
                            <span className="text-[10px] font-bold tracking-wider text-muted-foreground">SUBTOTAL {grupo.label}</span>
                            <span /><span /><span /><span />
                            <span className="text-right font-bold text-sm text-primary">{formatCLP(subtotal)}</span>
                            <span />
                          </div>
                        </div>
                      );
                    })}

                    {items.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Sin ítems. Agrega repuestos, servicios o mano de obra arriba.</p>
                      </div>
                    )}
                  </div>

                  {/* Botón enviar cotización */}
                  {items.length > 0 && (
                    <div className="mt-5 flex justify-end">
                      <Button onClick={abrirModalEnviar} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black tracking-wider px-6 py-3 text-sm">
                        <Send className="w-4 h-4 mr-2" /> Enviar cotización
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ RECEPCIÓN TAB ═══ */}
              {tab === 'recepción' && (
                <div className="space-y-6">
                  {/* Herramientas y accesorios */}
                  <div>
                    <h3 className="text-[10px] font-black tracking-[2px] text-primary mb-3">HERRAMIENTAS Y ACCESORIOS</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {[
                        { key: 'gato', label: 'Gato hidráulico' },
                        { key: 'llaveRuedas', label: 'Llave de ruedas' },
                        { key: 'ruedaRepuesto', label: 'Rueda de repuesto' },
                        { key: 'triangulos', label: 'Triángulos' },
                        { key: 'extintor', label: 'Extintor' },
                        { key: 'botiquin', label: 'Botiquín' },
                        { key: 'documentos', label: 'Documentos al día' },
                      ].map(item => (
                        <label key={item.key}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                            checklist[item.key] ? 'border-primary bg-primary/10' : 'border-border bg-secondary/10 hover:bg-secondary/20'
                          }`}>
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                            checklist[item.key] ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                          }`}>
                            {checklist[item.key] && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="text-sm font-medium text-foreground">{item.label}</span>
                          <input type="checkbox" className="hidden" checked={!!checklist[item.key]}
                            onChange={() => setChecklist({ ...checklist, [item.key]: !checklist[item.key] })} />
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Estado y niveles */}
                  <div>
                    <h3 className="text-[10px] font-black tracking-[2px] text-primary mb-3">ESTADO DEL VEHÍCULO</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1">ESTADO CARROCERÍA</label>
                        <select value={checklist.estadoCarroceria ?? ''}
                          onChange={e => setChecklist({ ...checklist, estadoCarroceria: e.target.value })}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                          <option value="">Sin evaluar</option>
                          <option value="BUENO">Bueno</option>
                          <option value="REGULAR">Regular</option>
                          <option value="MALO">Malo</option>
                          <option value="CON_DANOS">Con daños</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1">NIVEL ACEITE</label>
                        <select value={checklist.nivelAceite ?? ''}
                          onChange={e => setChecklist({ ...checklist, nivelAceite: e.target.value })}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                          <option value="">Sin evaluar</option>
                          <option value="LLENO">Lleno</option>
                          <option value="3_4">3/4</option>
                          <option value="1_2">1/2</option>
                          <option value="1_4">1/4</option>
                          <option value="BAJO">Bajo / Crítico</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1">LÍQUIDO DE FRENOS</label>
                        <select value={checklist.nivelLiquidoFrenos ?? ''}
                          onChange={e => setChecklist({ ...checklist, nivelLiquidoFrenos: e.target.value })}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                          <option value="">Sin evaluar</option>
                          <option value="LLENO">Lleno</option>
                          <option value="3_4">3/4</option>
                          <option value="1_2">1/2</option>
                          <option value="1_4">1/4</option>
                          <option value="BAJO">Bajo / Crítico</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted-foreground block mb-1">NIVEL COMBUSTIBLE</label>
                        <div className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                          {ot?.nivelCombustible ?? <span className="text-muted-foreground">No registrado</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Descripción de ingreso (solo lectura, viene de la creación de la OT) */}
                  {ot?.descripcion && (
                    <div>
                      <h3 className="text-[10px] font-black tracking-[2px] text-primary mb-3">DESCRIPCIÓN DE INGRESO</h3>
                      <div className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm text-foreground whitespace-pre-wrap">
                        {ot.descripcion}
                      </div>
                    </div>
                  )}

                  {/* Observaciones */}
                  <div>
                    <h3 className="text-[10px] font-black tracking-[2px] text-primary mb-3">OBSERVACIONES DE RECEPCIÓN</h3>
                    <Textarea value={checklist.observaciones ?? ''}
                      onChange={e => setChecklist({ ...checklist, observaciones: e.target.value })}
                      placeholder="Daños visibles, rayones, abolladuras, piezas faltantes, observaciones del conductor"
                      rows={4} />
                  </div>

                  {/* Guardar */}
                  <div className="flex justify-end">
                    <Button onClick={guardarChecklist} disabled={checklistSaving} className="font-black tracking-wider text-xs">
                      {checklistSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Guardar checklist
                    </Button>
                  </div>
                </div>
              )}

              {/* ═══ FOTOS TAB ═══ */}
              {tab === 'fotos' && (
                <div>
                  {fotos.length > 0 && (
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={handleUploadFoto} />
                        <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition">
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          Subir Fotografía
                        </div>
                      </label>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {uploadPreview && (
                      <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-dashed border-primary/50 bg-muted animate-pulse">
                        <Image src={uploadPreview} alt="Subiendo..." fill className="object-cover opacity-60" unoptimized />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                      </div>
                    )}
                    {fotos.map((foto: any) => (
                      <div key={foto.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group">
                        <Image src={foto.url ?? foto.cloudStoragePath}
                          alt={foto.fileName ?? 'Foto OT'} fill className="object-cover" unoptimized />
                        <Badge className="absolute top-2 left-2 text-[9px]" variant="secondary">{foto.tipoFoto}</Badge>
                        <button
                          onClick={async () => {
                            if (!confirm('¿Eliminar esta foto?')) return;
                            try {
                              await fetch(`/api/ordenes/${otId}/fotos/${foto.id}`, { method: 'DELETE' });
                              fetchFotos();
                              toast.success('Foto eliminada');
                            } catch { toast.error('Error al eliminar'); }
                          }}
                          className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                          title="Eliminar foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {fotos.length === 0 && (
                      <div className="col-span-full text-center py-12 text-muted-foreground">
                        <Camera className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Sin fotografías. Usa el botón de abajo para subir.</p>
                        <div className="flex items-center justify-center mt-4">
                          <label className="cursor-pointer">
                            <input type="file" accept="image/*" className="hidden" onChange={handleUploadFoto} />
                            <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition">
                              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                              Subir Fotografía
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: SIDEBAR SUMMARY */}
        <div className="lg:col-span-4 space-y-4">
          {/* Datos de entrega */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-[10px] font-black text-primary tracking-[2px] mb-4">DATOS DE LA OT</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold mb-0.5">DÍAS EN TALLER</label>
                  <span className="text-xl font-black text-foreground">{dias} <span className="text-xs text-muted-foreground">días corridos</span></span>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold mb-0.5">FECHA INGRESO</label>
                  <span className="text-sm font-bold text-foreground">{formatDate(ot?.fechaIngreso)}</span>
                </div>
                {ot?.updatedAt && (
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold mb-0.5">ÚLTIMA ACTUALIZACIÓN</label>
                    <span className="text-sm font-bold text-foreground">{formatDateTime(ot.updatedAt)}</span>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold mb-0.5">MECÁNICO RESPONSABLE</label>
                  {!editMecanico ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{ot?.mecanico?.nombre ?? 'Sin asignar'}</span>
                      <button onClick={() => { setEditMecanico(true); setNuevoMecanicoId(ot?.mecanicoId ?? ''); }}
                        className="text-muted-foreground hover:text-foreground transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 mt-1">
                      <select value={nuevoMecanicoId}
                        onChange={e => {
                          if (e.target.value === '__nuevo__') { setShowCrearMecInline(true); return; }
                          setNuevoMecanicoId(e.target.value);
                        }}
                        className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground">
                        <option value="">Sin asignar</option>
                        {mecanicos.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        <option value="__nuevo__">+ Agregar mecánico</option>
                      </select>
                      {showCrearMecInline && (
                        <div className="p-2 border border-primary/30 rounded-lg bg-primary/5 space-y-1.5">
                          <input value={mecNombreInline} onChange={e => setMecNombreInline(e.target.value)}
                            placeholder="Nombre del mecánico"
                            className="w-full h-7 text-xs bg-background border border-border rounded px-2 text-foreground"
                            onKeyDown={(e: any) => e.key === 'Enter' && crearMecanicoInline()} />
                          <div className="flex gap-1">
                            <button onClick={crearMecanicoInline} disabled={creandoMecInline || !mecNombreInline.trim()}
                              className="text-xs bg-primary text-white px-2 py-1 rounded disabled:opacity-50">
                              {creandoMecInline ? 'Creando...' : 'Crear'}
                            </button>
                            <button onClick={() => { setShowCrearMecInline(false); setMecNombreInline(''); }}
                              className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-1">
                        <button onClick={cambiarMecanico} disabled={savingMecanico}
                          className="text-xs bg-primary text-white px-2 py-1 rounded-md hover:bg-primary/90 disabled:opacity-50">
                          {savingMecanico ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button onClick={() => { setEditMecanico(false); setShowCrearMecInline(false); setMecNombreInline(''); }}
                          className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {ot?.conductorNombre && (
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold mb-0.5">CONDUCTOR</label>
                    <span className="text-sm font-bold text-foreground">{ot.conductorNombre}</span>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold mb-0.5">MOTIVO</label>
                  <span className="text-sm text-foreground">{ot?.motivoIngreso ?? '—'}</span>
                </div>

                {/* Resumen financiero */}
                <div className="pt-3 mt-3 border-t border-border space-y-2">
                  {GRUPOS.filter(g => totalGrupo(g.key) > 0).map(g => (
                    <div key={g.key} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{g.label}</span>
                      <span className={`font-bold ${g.key === 'DESCUENTO' ? 'text-destructive' : 'text-foreground'}`}>
                        {g.key === 'DESCUENTO' ? `-${formatCLP(totalGrupo(g.key))}` : formatCLP(totalGrupo(g.key))}
                      </span>
                    </div>
                  ))}
                  {items.length > 0 && (
                    <>
                      <div className="flex justify-between text-xs pt-1 border-t border-border">
                        <span className="text-muted-foreground">Costo operativo</span>
                        <span className="text-muted-foreground font-bold">{formatCLP(totalCosto)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Margen global</span>
                        <span className={`font-black ${margenGlobal >= 25 ? 'text-emerald-500' : margenGlobal >= 15 ? 'text-primary' : 'text-destructive'}`}>
                          {Math.round(margenGlobal)}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total card */}
          {items.length > 0 && (
            <div className="bg-primary rounded-lg p-5 text-primary-foreground">
              <div className="text-[10px] font-black opacity-60 tracking-widest mb-1">TOTAL NETO</div>
              <div className="text-3xl font-black">{formatCLP(totalGeneral)}</div>
              <div className="border-t border-primary-foreground/20 mt-3 pt-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span>IVA (19%):</span>
                  <span className="font-bold">{formatCLP(totalGeneral * 0.19)}</span>
                </div>
                <div className="flex justify-between text-sm font-black">
                  <span>TOTAL c/IVA:</span>
                  <span>{formatCLP(totalGeneral * 1.19)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 print:hidden">
            <button onClick={() => window.print()}
              className="flex items-center justify-center gap-2 h-14 rounded-lg bg-primary text-primary-foreground font-black text-xs tracking-widest hover:bg-primary/90 transition">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={abrirModalEnviar}
              className="flex items-center justify-center gap-2 h-14 rounded-lg border-2 border-primary text-primary font-black text-xs tracking-widest hover:bg-primary/10 transition">
              <Send className="w-4 h-4" /> Enviar cotización
            </button>
          </div>
        </div>
      </div>

      </div>{/* end screen-only */}

      {/* ═══ MODAL ENVIAR COTIZACIÓN ═══ */}
      <Dialog open={showEnviar} onOpenChange={setShowEnviar}>
        <DialogContent className="sm:max-w-[520px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Mail className="w-5 h-5 text-primary" />
              Enviar Cotización — OT-{otNum}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Remitente */}
            <div>
              <label className="text-[10px] font-black tracking-widest text-muted-foreground block mb-1.5">CUENTA REMITENTE</label>
              {cuentasCorreo.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay cuentas configuradas. Ve a <Link href="/configuracion" className="text-primary underline">Configuración</Link> para agregar.</p>
              ) : (
                <select value={cuentaSeleccionada} onChange={(e) => setCuentaSeleccionada(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground">
                  {cuentasCorreo.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nombre} — {c.email}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Destinatarios */}
            <div>
              <label className="text-[10px] font-black tracking-widest text-muted-foreground block mb-1.5">DESTINATARIOS</label>
              <div className="space-y-2">
                {/* Contactos del cliente */}
                {contactos.length > 0 && contactos.map((c: any) => (
                  <label key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-secondary/20 cursor-pointer transition">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${destinatarios.includes(c.email) ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                      {destinatarios.includes(c.email) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.nombre}{c.cargo ? ` — ${c.cargo}` : ''}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                    </div>
                    <input type="checkbox" className="hidden" checked={destinatarios.includes(c.email)} onChange={() => toggleDestinatario(c.email)} />
                  </label>
                ))}

                {/* Email del cliente principal */}
                {ot?.vehiculo?.cliente?.email && !contactos.find((c: any) => c.email === ot.vehiculo.cliente.email) && (
                  <label className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-secondary/20 cursor-pointer transition">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${destinatarios.includes(ot.vehiculo.cliente.email) ? 'bg-primary border-primary' : 'border-muted-foreground/30'}`}>
                      {destinatarios.includes(ot.vehiculo.cliente.email) && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{ot.vehiculo.cliente.razonSocial} <span className="text-xs text-muted-foreground">(principal)</span></p>
                      <p className="text-xs text-muted-foreground truncate">{ot.vehiculo.cliente.email}</p>
                    </div>
                    <input type="checkbox" className="hidden" checked={destinatarios.includes(ot.vehiculo.cliente.email)} onChange={() => toggleDestinatario(ot.vehiculo.cliente.email)} />
                  </label>
                )}

                {contactos.length === 0 && !ot?.vehiculo?.cliente?.email && (
                  <p className="text-sm text-muted-foreground py-2">Sin contactos registrados para este cliente.</p>
                )}

                {/* Agregar nuevo contacto */}
                {!showNuevoContacto ? (
                  <button onClick={() => setShowNuevoContacto(true)} className="flex items-center gap-2 text-sm text-primary hover:underline mt-1">
                    <UserPlus className="w-4 h-4" /> Agregar nuevo contacto
                  </button>
                ) : (
                  <div className="p-3 rounded-lg border border-primary/30 bg-secondary/10 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Nombre *" value={nuevoContactoNombre} onChange={(e) => setNuevoContactoNombre(e.target.value)} />
                      <Input placeholder="Cargo" value={nuevoContactoCargo} onChange={(e) => setNuevoContactoCargo(e.target.value)} />
                    </div>
                    <Input placeholder="Email *" type="email" value={nuevoContactoEmail} onChange={(e) => setNuevoContactoEmail(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={agregarContacto} disabled={!nuevoContactoNombre.trim() || !nuevoContactoEmail.trim()}>Guardar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowNuevoContacto(false)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Email manual adicional */}
            <div>
              <label className="text-[10px] font-black tracking-widest text-muted-foreground block mb-1.5">CORREO ADICIONAL (OPCIONAL)</label>
              <Input placeholder="otro@correo.com" type="email" value={emailManual} onChange={(e) => setEmailManual(e.target.value)} />
            </div>

            {/* Resumen */}
            <div className="bg-secondary/20 rounded-lg p-3 border border-border">
              <p className="text-[10px] font-black tracking-widest text-muted-foreground mb-2">RESUMEN DE ENVÍO</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vehículo</span>
                <span className="font-bold text-foreground">{patente} — {vehiculoDesc}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Total Neto</span>
                <span className="font-bold text-foreground">{formatCLP(totalGeneral)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Total c/IVA</span>
                <span className="font-black text-primary">{formatCLP(totalGeneral * 1.19)}</span>
              </div>
            </div>

            {/* Botón enviar */}
            <Button onClick={enviarCotizacion} disabled={enviando || cuentasCorreo.length === 0}
              className="w-full font-black tracking-wider py-3 text-sm">
              {enviando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {enviando ? 'Enviando...' : 'Enviar cotización'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}