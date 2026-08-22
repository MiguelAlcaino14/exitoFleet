'use client';

import { useState, useEffect } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter, useSearchParams } from 'next/navigation';
import { ThemeToggleButton } from '@/components/theme-toggle-button';

function formatRut(value: string): string {
  let clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length === 0) return '';
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  if (body.length === 0) return clean;
  let formatted = '';
  const reversed = body.split('').reverse();
  for (let i = 0; i < reversed.length; i++) {
    if (i > 0 && i % 3 === 0) formatted = '.' + formatted;
    formatted = reversed[i] + formatted;
  }
  return formatted + '-' + dv;
}

interface TallerConfig {
  nombre: string;
  razonSocial: string;
  logoUrl: string;
  colorPrimario: string;
}

export default function PortalLoginForm() {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotRut, setForgotRut] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [tallerConfig, setTallerConfig] = useState<TallerConfig | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tallerSlug = searchParams.get('taller');

  useEffect(() => {
    if (!tallerSlug) return;
    fetch(`/api/portal/taller-config?slug=${encodeURIComponent(tallerSlug)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setTallerConfig(d); })
      .catch(() => {});
  }, [tallerSlug]);

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.length < rut.length) { setRut(raw); return; }
    setRut(formatRut(raw));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Error al iniciar sesión'); setLoading(false); return; }
      router.push('/portal');
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotRut.trim()) { setForgotError('Ingresa tu RUT'); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      await fetch('/api/portal/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut: forgotRut }),
      });
      setForgotSent(true);
    } catch {
      setForgotError('Error de conexión. Intenta nuevamente.');
    }
    setForgotLoading(false);
  };

  const colorPrimario = tallerConfig?.colorPrimario ?? '#2563eb';
  const nombre = tallerConfig?.razonSocial || tallerConfig?.nombre || 'D Motor';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggleButton />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {tallerConfig?.logoUrl ? (
            <Image
              src={tallerConfig.logoUrl}
              alt={nombre}
              width={200}
              height={60}
              className="object-contain mx-auto mb-2"
              priority
              unoptimized
            />
          ) : (
            <div className="mx-auto mb-2">
              {!tallerSlug ? (
                <Image src="/logo.png" alt="D Motor" width={180} height={54} className="object-contain mx-auto" priority />
              ) : (
                <h1 className="text-2xl font-black text-foreground">{nombre}</h1>
              )}
            </div>
          )}
          <p className="text-muted-foreground text-sm mt-1">Portal de Clientes</p>
        </div>

        <form onSubmit={handleLogin} className="bg-card border border-border rounded-xl p-6 space-y-5 shadow-lg">
          <div>
            <Label className="text-muted-foreground text-xs font-bold">RUT</Label>
            <Input
              value={rut}
              onChange={handleRutChange}
              type="text"
              placeholder="76.314.706-1"
              className="mt-1 bg-background border-border text-foreground"
              required
              maxLength={12}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Ingrese solo los números, el formato se aplica automáticamente</p>
          </div>
          <div>
            <Label className="text-muted-foreground text-xs font-bold">Contraseña</Label>
            <div className="relative mt-1">
              <Input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="bg-background border-border text-foreground pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <Button
            type="submit"
            disabled={loading}
            className="w-full font-black tracking-wider"
            style={{ backgroundColor: colorPrimario, borderColor: colorPrimario }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Ingresar
          </Button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => { setShowForgot(prev => !prev); setForgotSent(false); setForgotError(''); setForgotRut(''); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
            {showForgot && (
              <div className="mt-3 bg-muted/50 rounded-lg p-4 text-left">
                {forgotSent ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 text-center font-medium">
                    Si tu RUT tiene un email registrado, recibirás una contraseña temporal en breve.
                  </p>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-2">Ingresa tu RUT y te enviaremos una contraseña temporal al email registrado.</p>
                    <Input
                      value={forgotRut}
                      onChange={e => { setForgotRut(formatRut(e.target.value)); setForgotError(''); }}
                      placeholder="76.314.706-1"
                      className="h-8 text-sm bg-background border-border"
                      maxLength={12}
                    />
                    {forgotError && <p className="text-xs text-red-500">{forgotError}</p>}
                    <Button
                      type="submit"
                      size="sm"
                      disabled={forgotLoading}
                      className="w-full h-8 text-xs"
                      style={{ backgroundColor: colorPrimario }}
                    >
                      {forgotLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      {forgotLoading ? 'Enviando...' : 'Enviar contraseña temporal'}
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </form>

        <p className="text-center text-muted-foreground text-xs mt-6">Solicita tus credenciales al taller</p>
      </div>
    </div>
  );
}
