import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

const ROLE_ROUTES: [string, string[]][] = [
  ['/admin', ['SUPER_ADMIN']],
  ['/api/admin', ['SUPER_ADMIN']],
  ['/finanzas', ['ADMIN', 'FINANZAS', 'SUPER_ADMIN']],
  ['/api/finanzas', ['ADMIN', 'FINANZAS', 'SUPER_ADMIN']],
  ['/configuracion', ['ADMIN', 'SUPER_ADMIN']],
  ['/api/configuracion-taller', ['ADMIN', 'SUPER_ADMIN']],
  ['/api/cuentas-correo', ['ADMIN', 'SUPER_ADMIN']],
  ['/ot/nueva', ['ADMIN', 'JEFE_TALLER', 'RECEPCION', 'SUPER_ADMIN']],
  ['/kanban', ['ADMIN', 'JEFE_TALLER', 'RECEPCION', 'SUPER_ADMIN']],
  ['/vehiculos', ['ADMIN', 'JEFE_TALLER', 'RECEPCION', 'SUPER_ADMIN']],
  ['/api/vehiculos', ['ADMIN', 'JEFE_TALLER', 'RECEPCION', 'SUPER_ADMIN']],
  ['/clientes', ['ADMIN', 'JEFE_TALLER', 'RECEPCION', 'FINANZAS', 'SUPER_ADMIN']],
  ['/api/clientes', ['ADMIN', 'JEFE_TALLER', 'RECEPCION', 'FINANZAS', 'SUPER_ADMIN']],
  ['/historial', ['ADMIN', 'JEFE_TALLER', 'RECEPCION', 'FINANZAS', 'SUPER_ADMIN']],
];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token as any;
    const role: string = token?.role ?? '';

    for (const [prefix, allowed] of ROLE_ROUTES) {
      if (pathname.startsWith(prefix) && !allowed.includes(role)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
        }
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token && (token as any).error !== 'USER_INACTIVE',
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*', '/ot/:path*', '/kanban/:path*', '/clientes/:path*',
    '/finanzas/:path*', '/configuracion/:path*', '/historial/:path*',
    '/vehiculos/:path*', '/admin/:path*',
    '/api/clientes/:path*', '/api/vehiculos/:path*', '/api/ordenes/:path*',
    '/api/dashboard/:path*', '/api/upload/:path*', '/api/facturas/:path*',
    '/api/finanzas/:path*', '/api/buscar/:path*', '/api/mecanicos/:path*',
    '/api/alertas/:path*', '/api/admin/:path*',
    '/api/signup', '/api/usuarios/:path*',
    '/api/configuracion-taller/:path*', '/api/cuentas-correo/:path*',
    '/api/items/:path*',
  ],
};
