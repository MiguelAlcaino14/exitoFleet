import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
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
