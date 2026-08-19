'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ThemeToggleButton } from '@/components/theme-toggle-button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Ingresa email y contraseña'); return; }
    setLoading(true);
    const result = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (result?.ok) {
      // Check role to redirect SUPER_ADMIN to admin panel
      try {
        const sess = await fetch('/api/auth/session').then(r => r.json());
        if (sess?.user?.role === 'SUPER_ADMIN') {
          router.replace('/admin');
        } else {
          router.replace('/dashboard');
        }
      } catch {
        router.replace('/dashboard');
      }
    } else {
      toast.error('Credenciales inválidas');
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
          <h2 className="text-xl font-semibold text-foreground mb-6">Iniciar Sesión</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e: any) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative mt-1">
                <Input id="password" type={showPass ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e: any) => setPassword(e.target.value)} className="pr-10" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading} loading={loading}>
              <LogIn className="w-4 h-4 mr-2" /> Ingresar
            </Button>
          </form>
        </div>
        <p className="text-center text-muted-foreground text-xs mt-6">© 2026 D Motor</p>
      </div>
    </div>
  );
}
