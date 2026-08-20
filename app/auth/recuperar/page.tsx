'use client';

import { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ThemeToggleButton } from '@/components/theme-toggle-button';

export default function RecuperarPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error('Ingresa tu correo electrónico'); return; }
    setLoading(true);
    try {
      await fetch('/api/auth/recuperar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setEnviado(true);
    } catch {
      toast.error('Error al enviar el correo. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute top-4 right-4"><ThemeToggleButton /></div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="D Motor" width={180} height={54} className="object-contain mx-auto mb-2 dark:hidden" priority />
          <Image src="/logo-dark.png" alt="D Motor" width={180} height={54} className="object-contain mx-auto mb-2 hidden dark:block" priority />
        </div>
        <div className="bg-card border border-border rounded-xl p-8">
          {enviado ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Revisa tu correo</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Si existe una cuenta asociada a <span className="font-medium text-foreground">{email}</span>, recibirás un enlace para restablecer tu contraseña en los próximos minutos.
              </p>
              <Link href="/auth/login" className="text-primary text-sm font-medium hover:underline">
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-2">Recuperar contraseña</h2>
              <p className="text-muted-foreground text-sm mb-6">Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e: any) => setEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  <Mail className="w-4 h-4 mr-2" />
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <Link href="/auth/login" className="text-muted-foreground text-sm hover:text-foreground flex items-center justify-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}
        </div>
        <p className="text-center text-muted-foreground text-xs mt-6">© 2026 D Motor</p>
      </div>
    </div>
  );
}
