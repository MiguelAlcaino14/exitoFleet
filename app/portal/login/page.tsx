'use client';

import { useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { ThemeToggleButton } from '@/components/theme-toggle-button';

function formatRut(value: string): string {
  // Remove everything except digits and k/K
  let clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length === 0) return '';
  // Separate body and verifier
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  if (body.length === 0) return clean;
  // Add dots to body
  let formatted = '';
  const reversed = body.split('').reverse();
  for (let i = 0; i < reversed.length; i++) {
    if (i > 0 && i % 3 === 0) formatted = '.' + formatted;
    formatted = reversed[i] + formatted;
  }
  return formatted + '-' + dv;
}

export default function PortalLoginPage() {
  const [rut, setRut] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // If user is deleting, allow natural deletion
    if (raw.length < rut.length) {
      setRut(raw);
      return;
    }
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <ThemeToggleButton />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="D Motor" width={180} height={54} className="object-contain mx-auto mb-2" priority />
          <p className="text-muted-foreground text-sm mt-1">Portal de Clientes</p>
        </div>

        <form onSubmit={handleLogin} className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <Label className="text-muted-foreground text-xs font-bold">RUT Empresa</Label>
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
          <Button type="submit" disabled={loading} className="w-full font-black tracking-wider">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} INGRESAR
          </Button>
        </form>

        <p className="text-center text-muted-foreground text-xs mt-6">Solicita tus credenciales al taller</p>
      </div>
    </div>
  );
}
