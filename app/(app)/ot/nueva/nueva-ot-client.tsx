'use client';

import { useState, useEffect, useRef } from 'react';
import { validarRut, validarTelefono, validarEmail, formatRutInput, validarPatente, formatPatenteInput } from '@/lib/validaciones';
import { Search, Truck, User, CheckCircle, Plus, ArrowLeft, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const COMBUSTIBLES = [
  { val: 'E', label: 'E', color: '#ef4444' },
  { val: '1/4', label: '¼', color: '#f97316' },
  { val: '1/2', label: '½', color: '#eab308' },
  { val: '3/4', label: '¾', color: '#84cc16' },
  { val: 'F', label: 'F', color: '#22c55e' },
];

const TIPOS_VEHICULO = [
  'Camión', 'Tracto Camión', 'Furgón', 'Van', 'Bus', 'Minibus',
  'Remolque', 'Semirremolque', 'Grúa', 'Maquinaria', 'Otro',
];

const STEP_LABELS = ['Vehículo y Cliente', 'Datos de Ingreso', 'Checklist'];

const anioActual = new Date().getFullYear();
const ANIOS = Array.from({ length: anioActual - 1970 + 2 }, (_, i) => anioActual + 1 - i);

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <div className="flex items-center gap-1 mt-1">
      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
      <span className="text-xs text-red-500">{msg}</span>
    </div>
  );
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
              step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {s}
          </div>
          {s < 3 && (
            <div className={`h-0.5 w-8 ${step > s ? 'bg-primary' : 'bg-muted'}`} />
          )}
        </div>
      ))}
      <span className="ml-2 text-xs text-muted-foreground">{STEP_LABELS[step - 1]}</span>
    </div>
  );
}

export function NuevaOTClient() {
  const [screen, setScreen] = useState<'buscar' | 'formulario' | 'exito'>('buscar');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [patente, setPatente] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [vehiculo, setVehiculo] = useState<any>(null);
  const [esNuevo, setEsNuevo] = useState(false);
  const [buscarMsg, setBuscarMsg] = useState('');

  // Sugerencias de patente
  const [sugerencias, setSugerencias] = useState<any[]>([]);
  const [showSugerencias, setShowSugerencias] = useState(false);
  const sugerenciasRef = useRef<HTMLDivElement>(null);

  // Errores por campo (step 1)
  const [errores1, setErrores1] = useState<Record<string, string>>({});
  // Errores step 2
  const [errores2, setErrores2] = useState<Record<string, string>>({});
  // Errores step 3
  const [errores3, setErrores3] = useState<Record<string, string>>({});

  // Form fields
  const [km, setKm] = useState('');
  const [combustible, setCombustible] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [conductorMismoDatos, setConductorMismoDatos] = useState(false);
  const [conductorNombre, setConductorNombre] = useState('');
  const [conductorTelefono, setConductorTelefono] = useState('');
  const [mecanicoId, setMecanicoId] = useState('');
  const [mecanicos, setMecanicos] = useState<any[]>([]);

  // New vehicle/client
  const [nvMarca, setNvMarca] = useState('');
  const [nvModelo, setNvModelo] = useState('');
  const [nvAnio, setNvAnio] = useState('');
  const [nvTipo, setNvTipo] = useState('');
  const [nvVin, setNvVin] = useState('');
  const [ncRazonSocial, setNcRazonSocial] = useState('');
  const [ncRut, setNcRut] = useState('');
  const [ncEmail, setNcEmail] = useState('');
  const [ncTelefono, setNcTelefono] = useState('');

  // Checklist
  const [checklist, setChecklist] = useState({
    gato: false, llaveRuedas: false, ruedaRepuesto: false,
    triangulos: false, extintor: false, botiquin: false, documentos: false,
    estadoCarroceria: '', nivelAceite: '', nivelLiquidoFrenos: '', observaciones: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [otCreada, setOtCreada] = useState<any>(null);

  useEffect(() => {
    if (wizardStep === 2) {
      fetch('/api/mecanicos?activos=1').then(r => r.json()).then(d => setMecanicos(d ?? [])).catch(() => {});
    }
  }, [wizardStep]);

  // Sugerencias de patente al escribir
  useEffect(() => {
    if (patente.length < 2) { setSugerencias([]); setShowSugerencias(false); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vehiculos?buscar=${encodeURIComponent(patente)}&page=1`);
        const data = await res.json();
        setSugerencias((data.vehiculos ?? []).slice(0, 5));
        setShowSugerencias((data.vehiculos ?? []).length > 0);
      } catch { setSugerencias([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [patente]);

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sugerenciasRef.current && !sugerenciasRef.current.contains(e.target as Node)) {
        setShowSugerencias(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const seleccionarSugerencia = (v: any) => {
    setPatente(v.patente);
    setSugerencias([]);
    setShowSugerencias(false);
    // Auto-buscar
    setVehiculo(v);
    setEsNuevo(false);
    setWizardStep(2);
    setScreen('formulario');
    setBuscarMsg('');
  };

  const buscarPatente = async () => {
    if (!patente.trim()) { toast.error('Ingresa una patente'); return; }
    if (!validarPatente(patente)) { toast.error('Patente inválida — formato: ABCD-12, AB-1234 o A-1234'); return; }
    setBuscando(true);
    setBuscarMsg('');
    try {
      const res = await fetch(`/api/vehiculos/buscar?patente=${encodeURIComponent(patente.trim())}`);
      const data = await res.json();
      if (data?.found) {
        setVehiculo(data.vehiculo);
        setEsNuevo(false);
        setWizardStep(2);
        setScreen('formulario');
      } else {
        // No encontrado — NO crear automáticamente, mostrar mensaje
        setBuscarMsg('Vehículo no registrado. Puedes registrarlo como nuevo.');
        setVehiculo(null);
      }
    } catch {
      toast.error('Error al buscar vehículo');
    }
    setBuscando(false);
  };

  const iniciarNuevoVehiculo = () => {
    setEsNuevo(true);
    setVehiculo(null);
    setWizardStep(1);
    setScreen('formulario');
    setBuscarMsg('');
    setErrores1({});
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!nvMarca.trim()) errs.marca = 'Marca requerida';
    if (!nvModelo.trim()) errs.modelo = 'Modelo requerido';
    if (!nvAnio) errs.anio = 'Año requerido';
    if (!nvTipo) errs.tipo = 'Tipo requerido';
    if (!ncRazonSocial.trim()) errs.razonSocial = 'Razón social requerida';
    if (ncRut.trim() && !validarRut(ncRut)) errs.rut = 'RUT inválido — formato: 12.345.678-9';
    if (ncEmail.trim() && !validarEmail(ncEmail)) errs.email = 'Email inválido';
    if (ncTelefono.trim() && !validarTelefono(ncTelefono)) errs.telefono = 'Teléfono inválido';
    setErrores1(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!km.trim() || isNaN(Number(km))) errs.km = 'Kilometraje requerido';
    if (!combustible) errs.combustible = 'Nivel de combustible requerido';
    if (!motivo.trim()) errs.motivo = 'Motivo de ingreso requerido';
    if (!mecanicoId) errs.mecanico = 'Mecánico responsable requerido';
    if (!conductorMismoDatos) {
      if (!conductorNombre.trim()) errs.conductorNombre = 'Nombre del conductor requerido';
      if (!conductorTelefono.trim()) errs.conductorTelefono = 'Teléfono del conductor requerido';
      else if (!validarTelefono(conductorTelefono)) errs.conductorTelefono = 'Teléfono inválido';
    }
    setErrores2(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!checklist.estadoCarroceria.trim()) errs.estadoCarroceria = 'Estado de carrocería requerido';
    if (!checklist.nivelAceite.trim()) errs.nivelAceite = 'Nivel de aceite requerido';
    if (!checklist.nivelLiquidoFrenos.trim()) errs.nivelLiquidoFrenos = 'Nivel de líquido de frenos requerido';
    setErrores3(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (wizardStep === 1 && esNuevo && !validateStep1()) return;
    if (wizardStep === 2 && !validateStep2()) return;
    setWizardStep((prev) => (prev < 3 ? ((prev + 1) as 1 | 2 | 3) : prev));
  };

  const handleBack = () => {
    if (wizardStep === 1 || (wizardStep === 2 && !esNuevo)) {
      setScreen('buscar');
      setVehiculo(null);
      setEsNuevo(false);
      return;
    }
    setWizardStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : prev));
  };

  // Si conductor es mismo que contacto del cliente
  const nombreConductorFinal = conductorMismoDatos ? (vehiculo?.cliente?.razonSocial ?? ncRazonSocial) : conductorNombre;
  const telConductorFinal = conductorMismoDatos ? (vehiculo?.cliente?.telefono ?? ncTelefono) : conductorTelefono;

  const crearOT = async () => {
    if (!validateStep3()) return;
    setSubmitting(true);
    try {
      const body: any = {
        kilometraje: km,
        nivelCombustible: combustible,
        motivoIngreso: motivo,
        observaciones,
        conductorNombre: nombreConductorFinal,
        conductorTelefono: telConductorFinal,
        mecanicoId: mecanicoId || undefined,
        checklist,
      };

      if (vehiculo) {
        body.vehiculoId = vehiculo.id;
      } else {
        body.nuevoVehiculo = {
          patente: patente.toUpperCase().trim(),
          marca: nvMarca, modelo: nvModelo, anio: nvAnio,
          tipoVehiculo: nvTipo, vin: nvVin,
          nuevoCliente: { razonSocial: ncRazonSocial, rutEmpresa: ncRut || null, email: ncEmail, telefono: ncTelefono },
        };
      }

      const res = await fetch('/api/ordenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setOtCreada(data);
        setScreen('exito');
        toast.success('¡OT creada exitosamente!');
      } else {
        const err = await res.json();
        toast.error(err?.error ?? 'Error al crear OT');
      }
    } catch {
      toast.error('Error de conexión');
    }
    setSubmitting(false);
  };

  // Success screen
  if (screen === 'exito' && otCreada) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <div className="text-primary text-4xl font-extrabold font-mono tracking-wider mb-2">
            OT-{String(otCreada?.otNumero ?? '').padStart(4, '0')}
          </div>
          <p className="text-xl font-semibold text-foreground mb-2">¡Orden de Trabajo Creada!</p>
          <p className="text-muted-foreground text-sm mb-8">
            {otCreada?.vehiculo?.patente} • {otCreada?.vehiculo?.cliente?.razonSocial}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href={`/ot/${otCreada?.id}`}>
              <Button>Ver detalle</Button>
            </Link>
            <Button variant="outline" onClick={() => {
              setScreen('buscar');
              setPatente('');
              setVehiculo(null);
              setEsNuevo(false);
              setMotivo('');
              setKm('');
              setCombustible('');
              setObservaciones('');
              setConductorNombre('');
              setConductorTelefono('');
              setConductorMismoDatos(false);
              setMecanicoId('');
              setWizardStep(1);
              setBuscarMsg('');
              setErrores1({}); setErrores2({}); setErrores3({});
            }}>
              <Plus className="w-4 h-4 mr-2" /> Nueva OT
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight font-display">Nueva orden de trabajo</h1>
          <div className="w-10 h-1 bg-primary mt-2 rounded-full" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── PANTALLA: Búsqueda de patente ── */}
        {screen === 'buscar' && (
          <motion.div key="buscar" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" /> Buscar vehículo por patente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm mb-6">Ingresa la patente del vehículo para buscarlo en el sistema</p>
                <div className="relative" ref={sugerenciasRef}>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Input
                        placeholder="ABCD-12"
                        value={patente}
                        onChange={(e: any) => { setPatente(formatPatenteInput(e.target.value)); setBuscarMsg(''); }}
                        className="text-lg font-mono tracking-wider"
                        onKeyDown={(e: any) => e.key === 'Enter' && buscarPatente()}
                        onFocus={() => sugerencias.length > 0 && setShowSugerencias(true)}
                      />
                      {/* Dropdown sugerencias */}
                      {showSugerencias && sugerencias.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                          {sugerencias.map((v: any) => (
                            <button
                              key={v.id}
                              type="button"
                              className="w-full text-left px-4 py-2.5 hover:bg-secondary/50 flex items-center gap-3 transition"
                              onClick={() => seleccionarSugerencia(v)}
                            >
                              <Truck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-mono font-bold text-foreground">{v.patente}</span>
                              <span className="text-sm text-muted-foreground">{[v.marca, v.modelo].filter(Boolean).join(' ')}</span>
                              <span className="ml-auto text-xs text-muted-foreground">{v.cliente?.razonSocial}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button onClick={buscarPatente} disabled={buscando} loading={buscando}>
                      <Search className="w-4 h-4 mr-2" /> Buscar
                    </Button>
                  </div>

                  {/* Mensaje si no existe */}
                  {buscarMsg && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        {buscarMsg}
                      </div>
                      <Button size="sm" onClick={iniciarNuevoVehiculo} className="ml-4 flex-shrink-0">
                        <Plus className="w-4 h-4 mr-1" /> Registrar vehículo
                      </Button>
                    </motion.div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ── PANTALLA: Wizard de formulario ── */}
        {screen === 'formulario' && (
          <motion.div key="formulario" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">

            <StepIndicator step={wizardStep} />

            <AnimatePresence mode="wait">
              {/* ── PASO 1: Vehículo y Cliente (solo si es nuevo) ── */}
              {wizardStep === 1 && esNuevo && (
                <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Nuevo vehículo: {patente}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Marca *</Label>
                          <Input className={`mt-1 ${errores1.marca ? 'border-red-500' : ''}`} value={nvMarca}
                            onChange={(e: any) => { setNvMarca(e.target.value); setErrores1(p => ({ ...p, marca: '' })); }}
                            placeholder="Volvo, Scania, Mercedes" />
                          <FieldError msg={errores1.marca} />
                        </div>
                        <div>
                          <Label>Modelo *</Label>
                          <Input className={`mt-1 ${errores1.modelo ? 'border-red-500' : ''}`} value={nvModelo}
                            onChange={(e: any) => { setNvModelo(e.target.value); setErrores1(p => ({ ...p, modelo: '' })); }}
                            placeholder="FH 540, Axor 2535" />
                          <FieldError msg={errores1.modelo} />
                        </div>
                        <div>
                          <Label>Tipo *</Label>
                          <select value={nvTipo}
                            onChange={(e: any) => { setNvTipo(e.target.value); setErrores1(p => ({ ...p, tipo: '' })); }}
                            className={`w-full mt-1 bg-background border rounded-lg px-3 py-2 text-sm text-foreground ${errores1.tipo ? 'border-red-500' : 'border-border'}`}>
                            <option value="">Selecciona un tipo</option>
                            {TIPOS_VEHICULO.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <FieldError msg={errores1.tipo} />
                        </div>
                        <div>
                          <Label>Año *</Label>
                          <select value={nvAnio}
                            onChange={(e: any) => { setNvAnio(e.target.value); setErrores1(p => ({ ...p, anio: '' })); }}
                            className={`w-full mt-1 bg-background border rounded-lg px-3 py-2 text-sm text-foreground ${errores1.anio ? 'border-red-500' : 'border-border'}`}>
                            <option value="">Selecciona un año</option>
                            {ANIOS.map(a => <option key={a} value={String(a)}>{a}</option>)}
                          </select>
                          <FieldError msg={errores1.anio} />
                        </div>
                      </div>
                      <div>
                        <Label>VIN / N° Chasis</Label>
                        <Input className="mt-1" value={nvVin}
                          onChange={(e: any) => setNvVin(e.target.value)} placeholder="Número de chasis o VIN" />
                      </div>

                      <div className="border-t border-border pt-4 mt-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Datos del cliente *</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Razón social *</Label>
                            <Input className={`mt-1 ${errores1.razonSocial ? 'border-red-500' : ''}`} value={ncRazonSocial}
                              onChange={(e: any) => { setNcRazonSocial(e.target.value); setErrores1(p => ({ ...p, razonSocial: '' })); }}
                              placeholder="Empresa Transportes S.A." />
                            <FieldError msg={errores1.razonSocial} />
                          </div>
                          <div>
                            <Label>RUT empresa</Label>
                            <Input className={`mt-1 ${errores1.rut ? 'border-red-500' : ''}`} value={ncRut}
                              onChange={(e: any) => { setNcRut(formatRutInput(e.target.value)); setErrores1(p => ({ ...p, rut: '' })); }}
                              placeholder="76.123.456-7" />
                            <FieldError msg={errores1.rut} />
                          </div>
                          <div>
                            <Label>Email</Label>
                            <Input className={`mt-1 ${errores1.email ? 'border-red-500' : ''}`} value={ncEmail}
                              onChange={(e: any) => { setNcEmail(e.target.value); setErrores1(p => ({ ...p, email: '' })); }}
                              placeholder="contacto@empresa.cl" type="email" />
                            <FieldError msg={errores1.email} />
                          </div>
                          <div>
                            <Label>Teléfono</Label>
                            <Input className={`mt-1 ${errores1.telefono ? 'border-red-500' : ''}`} value={ncTelefono}
                              onChange={(e: any) => { setNcTelefono(e.target.value); setErrores1(p => ({ ...p, telefono: '' })); }}
                              placeholder="+56 9 1234 5678" />
                            <FieldError msg={errores1.telefono} />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── PASO 2: Datos de Ingreso ── */}
              {wizardStep === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
                  {/* Card resumen vehículo existente */}
                  {vehiculo && (
                    <Card className="border-primary/30">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Truck className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="text-lg font-bold text-foreground font-mono">{vehiculo?.patente}</div>
                            <div className="text-sm text-muted-foreground">{vehiculo?.marca} {vehiculo?.modelo} {vehiculo?.anio ? `(${vehiculo.anio})` : ''}</div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <User className="w-3.5 h-3.5 inline mr-1" /> {vehiculo?.cliente?.razonSocial}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader><CardTitle className="text-base">Datos de ingreso</CardTitle></CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Kilometraje *</Label>
                          <Input
                            className={`mt-1 font-mono ${errores2.km ? 'border-red-500' : ''}`}
                            value={km}
                            onChange={(e: any) => { setKm(e.target.value.replace(/[^0-9]/g, '')); setErrores2(p => ({ ...p, km: '' })); }}
                            placeholder="54000"
                            inputMode="numeric"
                            style={{ MozAppearance: 'textfield' } as any}
                            onWheel={(e: any) => e.target.blur()}
                          />
                          <FieldError msg={errores2.km} />
                        </div>
                        <div>
                          <Label>Nivel de combustible *</Label>
                          <div className="flex gap-2 mt-1">
                            {COMBUSTIBLES.map((c) => (
                              <button
                                key={c.val}
                                type="button"
                                onClick={() => { setCombustible(c.val); setErrores2(p => ({ ...p, combustible: '' })); }}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border ${
                                  combustible === c.val
                                    ? 'text-white shadow-lg scale-105'
                                    : 'bg-muted text-muted-foreground border-border hover:bg-secondary'
                                }`}
                                style={combustible === c.val ? { backgroundColor: c.color, borderColor: c.color } : {}}
                              >
                                {c.label}
                              </button>
                            ))}
                          </div>
                          <FieldError msg={errores2.combustible} />
                        </div>
                      </div>

                      <div>
                        <Label>Motivo de ingreso *</Label>
                        <Textarea
                          className={`mt-1 ${errores2.motivo ? 'border-red-500' : ''}`}
                          rows={3}
                          value={motivo}
                          onChange={(e: any) => { setMotivo(e.target.value); setErrores2(p => ({ ...p, motivo: '' })); }}
                          placeholder="Describa el motivo del ingreso al taller"
                        />
                        <FieldError msg={errores2.motivo} />
                      </div>

                      {/* Conductor */}
                      <div className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Datos del conductor *</Label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={conductorMismoDatos}
                              onCheckedChange={(v: any) => setConductorMismoDatos(!!v)}
                            />
                            <span className="text-xs text-muted-foreground">Mismos datos del contacto</span>
                          </label>
                        </div>
                        {!conductorMismoDatos && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs">Nombre *</Label>
                              <Input
                                className={`mt-1 ${errores2.conductorNombre ? 'border-red-500' : ''}`}
                                value={conductorNombre}
                                onChange={(e: any) => { setConductorNombre(e.target.value); setErrores2(p => ({ ...p, conductorNombre: '' })); }}
                                placeholder="Juan Pérez"
                              />
                              <FieldError msg={errores2.conductorNombre} />
                            </div>
                            <div>
                              <Label className="text-xs">Teléfono *</Label>
                              <Input
                                className={`mt-1 ${errores2.conductorTelefono ? 'border-red-500' : ''}`}
                                value={conductorTelefono}
                                onChange={(e: any) => { setConductorTelefono(e.target.value); setErrores2(p => ({ ...p, conductorTelefono: '' })); }}
                                placeholder="+56 9 1234 5678"
                              />
                              <FieldError msg={errores2.conductorTelefono} />
                            </div>
                          </div>
                        )}
                        {conductorMismoDatos && (
                          <div className="text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                            Se usarán los datos del cliente: <strong>{vehiculo?.cliente?.razonSocial ?? ncRazonSocial || '—'}</strong>
                          </div>
                        )}
                      </div>

                      <div>
                        <Label>Mecánico responsable *</Label>
                        <select
                          value={mecanicoId}
                          onChange={(e: any) => { setMecanicoId(e.target.value); setErrores2(p => ({ ...p, mecanico: '' })); }}
                          className={`w-full mt-1 bg-background border rounded-lg px-3 py-2 text-sm text-foreground ${errores2.mecanico ? 'border-red-500' : 'border-border'}`}
                        >
                          <option value="">Selecciona un mecánico</option>
                          {mecanicos.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                        {mecanicos.length === 0 && (
                          <p className="text-xs text-amber-500 mt-1">No hay mecánicos activos. Agrégalos en Configuración → Mecánicos.</p>
                        )}
                        <FieldError msg={errores2.mecanico} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── PASO 3: Checklist ── */}
              {wizardStep === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Checklist de recepción</CardTitle></CardHeader>
                    <CardContent className="space-y-5">
                      <div>
                        <Label className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3 block">Elementos presentes en el vehículo</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[
                            { key: 'gato', label: 'Gato' },
                            { key: 'llaveRuedas', label: 'Llave ruedas' },
                            { key: 'ruedaRepuesto', label: 'Rueda repuesto' },
                            { key: 'triangulos', label: 'Triángulos' },
                            { key: 'extintor', label: 'Extintor' },
                            { key: 'botiquin', label: 'Botiquín' },
                            { key: 'documentos', label: 'Documentos' },
                          ].map((item) => (
                            <div key={item.key} className="flex items-center gap-2">
                              <Checkbox
                                checked={(checklist as any)?.[item.key] ?? false}
                                onCheckedChange={(v: any) => setChecklist((prev) => ({ ...(prev ?? {}), [item.key]: !!v }))}
                              />
                              <Label className="text-sm cursor-pointer">{item.label}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Label>Estado de carrocería *</Label>
                        <Input
                          className={`mt-1 ${errores3.estadoCarroceria ? 'border-red-500' : ''}`}
                          value={checklist?.estadoCarroceria ?? ''}
                          onChange={(e: any) => { setChecklist((p) => ({ ...(p ?? {}), estadoCarroceria: e.target.value })); setErrores3(p => ({ ...p, estadoCarroceria: '' })); }}
                          placeholder="Buen estado / Golpe lateral izquierdo"
                        />
                        <FieldError msg={errores3.estadoCarroceria} />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Nivel de aceite *</Label>
                          <Input
                            className={`mt-1 ${errores3.nivelAceite ? 'border-red-500' : ''}`}
                            value={checklist?.nivelAceite ?? ''}
                            onChange={(e: any) => { setChecklist((p) => ({ ...(p ?? {}), nivelAceite: e.target.value })); setErrores3(p => ({ ...p, nivelAceite: '' })); }}
                            placeholder="Normal / Bajo"
                          />
                          <FieldError msg={errores3.nivelAceite} />
                        </div>
                        <div>
                          <Label>Nivel líquido de frenos *</Label>
                          <Input
                            className={`mt-1 ${errores3.nivelLiquidoFrenos ? 'border-red-500' : ''}`}
                            value={checklist?.nivelLiquidoFrenos ?? ''}
                            onChange={(e: any) => { setChecklist((p) => ({ ...(p ?? {}), nivelLiquidoFrenos: e.target.value })); setErrores3(p => ({ ...p, nivelLiquidoFrenos: '' })); }}
                            placeholder="Normal / Bajo"
                          />
                          <FieldError msg={errores3.nivelLiquidoFrenos} />
                        </div>
                      </div>

                      <div>
                        <Label>Observaciones de recepción</Label>
                        <Textarea
                          className="mt-1"
                          rows={3}
                          value={checklist?.observaciones ?? ''}
                          onChange={(e: any) => setChecklist((p) => ({ ...(p ?? {}), observaciones: e.target.value }))}
                          placeholder="Observaciones adicionales de la recepción"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Botones de navegación ── */}
            <div className="flex gap-3 justify-between">
              <Button variant="outline" onClick={handleBack}>
                ← Atrás
              </Button>
              {wizardStep < 3 ? (
                <Button onClick={handleNext}>
                  Siguiente →
                </Button>
              ) : (
                <Button onClick={crearOT} disabled={submitting} loading={submitting}>
                  <Plus className="w-4 h-4 mr-2" /> Crear orden de trabajo
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
