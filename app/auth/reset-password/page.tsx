'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ThemeToggleButton } from '@/components/theme-toggle-button';

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState(false);

  if (!token) {
    return (
      <div className="text-center py-4">
        <p className="text-destructive font-medium">Enlace inválido o expirado.</p>
        <Link href="/auth/recuperar" className="text-primary text-sm mt-4 inline-block hover:underline">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) { toast.error('Ingresa la nueva contraseña'); return; }
    if (password.length < 6) { toast.error('Mínimo 6 caracteres'); return; }
    if (password !== confirm) { toast.error('Las contraseñas no coinciden'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? 'Error al restablecer la contraseña');
      } else {
        setListo(true);
        setTimeout(() => router.replace('/auth/login'), 3000);
      }
    } catch {
      toast.error('Error de conexión. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  if (listo) {
    return (
      <div className="text-center py-4">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">¡Contraseña actualizada!</h2>
        <p className="text-muted-foreground text-sm">Redirigiendo al inicio de sesión...</p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-foreground mb-2">Nueva contraseña</h2>
      <p className="text-muted-foreground text-sm mb-6">Ingresa tu nueva contraseña para acceder a D Motor.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="password">Nueva contraseña</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={showPass ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
              className="pr-10 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <Label htmlFor="confirm">Confirmar contraseña</Label>
          <div className="relative mt-1">
            <Input
              id="confirm"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repite la contraseña"
              value={confirm}
              onChange={(e: any) => setConfirm(e.target.value)}
              className="pr-10 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          <KeyRound className="w-4 h-4 mr-2" />
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4"><ThemeToggleButton /></div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="D Motor" width={180} height={54} className="object-contain mx-auto mb-2 dark:hidden" priority />
          <Image src="/logo-dark.png" alt="D Motor" width={180} height={54} className="object-contain mx-auto mb-2 hidden dark:block" priority />
        </div>
        <div className="bg-card border border-border rounded-xl p-8">
          <Suspense fallback={<div className="h-8 bg-muted animate-pulse rounded" />}>
            <ResetForm />
          </Suspense>
        </div>
        <p className="text-center text-muted-foreground text-xs mt-6">© 2026 D Motor</p>
      </div>
    </div>
  );
}
