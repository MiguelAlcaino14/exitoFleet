'use client';

import { useState, useEffect } from 'react';
import { validarRut, validarTelefono, validarEmail, formatRutInput, validarPatente, formatPatenteInput } from '@/lib/validaciones';
import { useRouter } from 'next/navigation';
import { Search, Truck, User, Fuel, Camera, CheckCircle, Plus, ArrowLeft, Loader2 } from 'lucide-react';
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

export function NuevaOTClient() {
  const router = useRouter();
  const [step, setStep] = useState<'buscar' | 'formulario' | 'exito'>('buscar');
  const [patente, setPatente] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [vehiculo, setVehiculo] = useState<any>(null);
  const [esNuevo, setEsNuevo] = useState(false);

  // Form fields
  const [km, setKm] = useState('');
  const [combustible, setCombustible] = useState('');
  const [motivo, setMotivo] = useState('');
  const [observaciones, setObservaciones] = useState('');
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

  useEffect(() => {
    fetch('/api/mecanicos?activos=1').then(r => r.json()).then(d => setMecanicos(d ?? [])).catch(() => {});
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const [otCreada, setOtCreada] = useState<any>(null);

  const buscarPatente = async () => {
    if (!patente.trim()) { toast.error('Ingresa una patente'); return; }
    if (!validarPatente(patente)) { toast.error('Patente inválida — formato: ABCD-12, AB-1234 o A-1234'); return; }
    setBuscando(true);
    try {
      const res = await fetch(`/api/vehiculos/buscar?patente=${encodeURIComponent(patente.trim())}`);
      const data = await res.json();
      if (data?.found) {
        setVehiculo(data.vehiculo);
        setEsNuevo(false);
      } else {
        setVehiculo(null);
        setEsNuevo(true);
      }
      setStep('formulario');
    } catch {
      toast.error('Error al buscar vehículo');
    }
    setBuscando(false);
  };

  const crearOT = async () => {
    if (!motivo.trim()) { toast.error('El motivo de ingreso es requerido'); return; }
    if (conductorTelefono.trim() && !validarTelefono(conductorTelefono)) { toast.error('Teléfono del conductor inválido — solo dígitos'); return; }
    if (esNuevo) {
      if (!ncRazonSocial.trim()) { toast.error('La razón social del cliente es requerida'); return; }
      if (ncRut.trim() && !validarRut(ncRut)) { toast.error('RUT del cliente inválido — formato: 12.345.678-9'); return; }
      if (ncEmail.trim() && !validarEmail(ncEmail)) { toast.error('Email del cliente inválido'); return; }
      if (ncTelefono.trim() && !validarTelefono(ncTelefono)) { toast.error('Teléfono del cliente inválido — solo dígitos'); return; }
      if (nvAnio.trim()) {
        const anio = parseInt(nvAnio);
        if (isNaN(anio) || anio < 1900 || anio > new Date().getFullYear() + 1) { toast.error('Año del vehículo inválido'); return; }
      }
    }
    setSubmitting(true);
    try {
      const body: any = {
        kilometraje: km,
        nivelCombustible: combustible,
        motivoIngreso: motivo,
        observaciones,
        conductorNombre,
        conductorTelefono,
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
        setStep('exito');
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
  if (step === 'exito' && otCreada) {
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
              <Button>Ver Detalle</Button>
            </Link>
            <Button variant="outline" onClick={() => { setStep('buscar'); setPatente(''); setVehiculo(null); setEsNuevo(false); setMotivo(''); setKm(''); setCombustible(''); setObservaciones(''); setConductorNombre(''); setConductorTelefono(''); }}>
              <Plus className="w-4 h-4 mr-2" /> Nueva OT
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-[900px]">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight font-display">Nueva Orden de Trabajo</h1>
          <div className="w-10 h-1 bg-primary mt-2 rounded-full" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'buscar' && (
          <motion.div key="buscar" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" /> Buscar por Patente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm mb-6">Ingresa la patente del vehículo para comenzar</p>
                <div className="flex gap-3">
                  <Input
                    placeholder="Ej: ABCD-12"
                    value={patente}
                    onChange={(e: any) => setPatente(formatPatenteInput(e.target.value))}
                    className="text-lg font-mono tracking-wider"
                    onKeyDown={(e: any) => e.key === 'Enter' && buscarPatente()}
                  />
                  <Button onClick={buscarPatente} disabled={buscando} loading={buscando}>
                    <Search className="w-4 h-4 mr-2" /> Buscar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'formulario' && (
          <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">

            {/* Vehicle info */}
            {vehiculo ? (
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
            ) : esNuevo ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Nuevo Vehículo: {patente}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Marca</Label><Input className="mt-1" value={nvMarca} onChange={(e: any) => setNvMarca(e.target.value)} placeholder="Volvo, Scania..." /></div>
                    <div><Label>Modelo</Label><Input className="mt-1" value={nvModelo} onChange={(e: any) => setNvModelo(e.target.value)} placeholder="FH 540..." /></div>
                    <div><Label>Año</Label><Input className="mt-1" value={nvAnio} onChange={(e: any) => setNvAnio(e.target.value)} placeholder="2024" type="number" /></div>
                    <div><Label>Tipo</Label><Input className="mt-1" value={nvTipo} onChange={(e: any) => setNvTipo(e.target.value)} placeholder="Tracto Camión" /></div>
                  </div>
                  <div><Label>VIN</Label><Input className="mt-1" value={nvVin} onChange={(e: any) => setNvVin(e.target.value)} placeholder="Número de chasis" /></div>

                  <div className="border-t border-border pt-4 mt-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Datos del Cliente</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Razón Social *</Label><Input className="mt-1" value={ncRazonSocial} onChange={(e: any) => setNcRazonSocial(e.target.value)} placeholder="Empresa S.A." /></div>
                      <div><Label>RUT Empresa</Label><Input className="mt-1" value={ncRut} onChange={(e: any) => setNcRut(formatRutInput(e.target.value))} placeholder="76.123.456-7" /></div>
                      <div><Label>Email</Label><Input className="mt-1" value={ncEmail} onChange={(e: any) => setNcEmail(e.target.value)} placeholder="contacto@empresa.cl" type="email" /></div>
                      <div><Label>Teléfono</Label><Input className="mt-1" value={ncTelefono} onChange={(e: any) => setNcTelefono(e.target.value)} placeholder="+569..." /></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Main form */}
            <Card>
              <CardHeader><CardTitle className="text-base">Datos de Ingreso</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Kilometraje</Label>
                    <Input className="mt-1 font-mono" value={km} onChange={(e: any) => setKm(e.target.value)} placeholder="Ej: 54000" type="number" />
                  </div>
                  <div>
                    <Label>Nivel Combustible</Label>
                    <div className="flex gap-2 mt-1">
                      {COMBUSTIBLES.map((c) => (
                        <button
                          key={c.val}
                          type="button"
                          onClick={() => setCombustible(c.val)}
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
                  </div>
                </div>

                <div>
                  <Label>Motivo de Ingreso *</Label>
                  <Textarea className="mt-1" rows={3} value={motivo} onChange={(e: any) => setMotivo(e.target.value)} placeholder="Describa el motivo del ingreso al taller..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Nombre Conductor</Label><Input className="mt-1" value={conductorNombre} onChange={(e: any) => setConductorNombre(e.target.value)} /></div>
                  <div><Label>Teléfono Conductor</Label><Input className="mt-1" value={conductorTelefono} onChange={(e: any) => setConductorTelefono(e.target.value)} /></div>
                </div>

                <div>
                  <Label>Mecánico Responsable</Label>
                  <select value={mecanicoId} onChange={(e: any) => setMecanicoId(e.target.value)}
                    className="w-full mt-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground">
                    <option value="">— Sin asignar —</option>
                    {mecanicos.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>

                <div>
                  <Label>Observaciones</Label>
                  <Textarea className="mt-1" rows={2} value={observaciones} onChange={(e: any) => setObservaciones(e.target.value)} placeholder="Observaciones adicionales..." />
                </div>
              </CardContent>
            </Card>

            {/* Checklist */}
            <Card>
              <CardHeader><CardTitle className="text-base">Checklist de Recepción</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { key: 'gato', label: 'Gato' },
                    { key: 'llaveRuedas', label: 'Llave Ruedas' },
                    { key: 'ruedaRepuesto', label: 'Rueda Repuesto' },
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
                <div className="mt-4">
                  <Label>Estado Carrocería</Label>
                  <Input className="mt-1" value={checklist?.estadoCarroceria ?? ''} onChange={(e: any) => setChecklist((p) => ({ ...(p ?? {}), estadoCarroceria: e.target.value }))} placeholder="Buen estado / Golpe lateral izq..." />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => { setStep('buscar'); setVehiculo(null); setEsNuevo(false); }}>Cancelar</Button>
              <Button onClick={crearOT} disabled={submitting} loading={submitting}>
                <Plus className="w-4 h-4 mr-2" /> Crear Orden de Trabajo
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
