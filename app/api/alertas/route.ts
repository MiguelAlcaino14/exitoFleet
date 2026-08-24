export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

function tiempoRelativo(fecha: Date): string {
  const diff = Date.now() - fecha.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Hace unos minutos';
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  return `Hace ${d} día${d > 1 ? 's' : ''}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const user = session.user as any;
  const role: string = user?.role ?? '';

  try {
    const now = new Date();
    const scope = await getTallerScope();
    const tw = tallerWhere(scope!);
    const isSuperAdmin = scope!.isSuperAdmin;
    const alertas: any[] = [];

    // ── SUPER_ADMIN: alertas de gestión de plataforma ──────────────────────
    if (isSuperAdmin) {
      const treintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Talleres sin ningún usuario asignado
      const talleresSinUsuarios = await prisma.taller.findMany({
        where: { activo: true, usuarios: { none: {} } },
        select: { id: true, nombre: true, createdAt: true },
      });
      talleresSinUsuarios.forEach((t: any) => {
        alertas.push({
          tipo: 'taller_sin_usuarios',
          nivel: 'critico',
          titulo: 'Taller sin usuarios',
          descripcion: `${t.nombre} no tiene usuarios asignados.`,
          tiempo: tiempoRelativo(new Date(t.createdAt)),
          tallerId: t.id,
        });
      });

      // Usuarios deshabilitados en los últimos 30 días
      const usuariosDeshabilitados = await prisma.user.findMany({
        where: { activo: false, updatedAt: { gt: treintaDiasAtras } },
        select: { id: true, nombre: true, rol: true, updatedAt: true, taller: { select: { nombre: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      usuariosDeshabilitados.forEach((u: any) => {
        alertas.push({
          tipo: 'usuario_deshabilitado',
          nivel: 'advertencia',
          titulo: 'Usuario deshabilitado',
          descripcion: `${u.nombre} no tiene acceso al sistema.${u.taller ? ` (${u.taller.nombre})` : ''}`,
          tiempo: tiempoRelativo(new Date(u.updatedAt)),
        });
      });

      // Talleres con configuración incompleta (sin email o sin teléfono)
      const talleresSinConfig = await prisma.taller.findMany({
        where: {
          activo: true,
          OR: [{ email: '' }, { telefono: '' }],
          usuarios: { some: {} },
        },
        select: { id: true, nombre: true, createdAt: true },
      });
      talleresSinConfig.forEach((t: any) => {
        alertas.push({
          tipo: 'config_pendiente',
          nivel: 'advertencia',
          titulo: 'Configuración pendiente',
          descripcion: `${t.nombre} aún no tiene email o teléfono configurado.`,
          tiempo: tiempoRelativo(new Date(t.createdAt)),
          tallerId: t.id,
        });
      });

      return NextResponse.json({ alertas, total: alertas.length });
    }

    // ── ROLES OPERATIVOS ────────────────────────────────────────────────────
    const tresDiasAtras = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const dosDiasAtras  = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const cincoDiasAtras = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const treintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const otInclude = {
      vehiculo: { select: { patente: true, cliente: { select: { razonSocial: true } } } },
    };

    const showOTAlertas = ['ADMIN', 'JEFE_TALLER', 'RECEPCION'].includes(role);
    const showFinanzas  = ['ADMIN', 'FINANZAS'].includes(role);
    const showDiagnostico = ['ADMIN', 'JEFE_TALLER', 'RECEPCION'].includes(role);
    const showAprobacion  = ['ADMIN', 'JEFE_TALLER', 'RECEPCION'].includes(role);
    const showTrabajoProlongado = ['ADMIN', 'JEFE_TALLER'].includes(role);

    // OTs esperando aprobación >3 días
    if (showAprobacion) {
      const sinAprobar = await prisma.ordenTrabajo.findMany({
        where: { ...tw, estado: 'ESPERANDO_APROBACION', fechaValorizacion: { lt: tresDiasAtras } },
        include: otInclude,
        orderBy: { fechaValorizacion: 'asc' },
      });
      sinAprobar.forEach((ot: any) => {
        const dias = Math.floor((now.getTime() - new Date(ot.fechaValorizacion).getTime()) / 86400000);
        alertas.push({
          tipo: 'sin_aprobar', nivel: 'critico',
          titulo: 'Sin aprobación',
          descripcion: `OT-${ot.otNumero} (${ot.vehiculo?.patente}) lleva ${dias} días esperando aprobación.`,
          tiempo: `Hace ${dias} día${dias > 1 ? 's' : ''}`,
          otId: ot.id, otNumero: ot.otNumero,
          cliente: ot.vehiculo?.cliente?.razonSocial,
        });
      });
    }

    // OTs por diagnosticar >2 días
    if (showDiagnostico) {
      const sinDiagnostico = await prisma.ordenTrabajo.findMany({
        where: { ...tw, estado: 'POR_DIAGNOSTICAR', fechaIngreso: { lt: dosDiasAtras } },
        include: otInclude,
        orderBy: { fechaIngreso: 'asc' },
      });
      sinDiagnostico.forEach((ot: any) => {
        const dias = Math.floor((now.getTime() - new Date(ot.fechaIngreso).getTime()) / 86400000);
        alertas.push({
          tipo: 'sin_diagnostico', nivel: 'advertencia',
          titulo: 'Sin diagnóstico',
          descripcion: `OT-${ot.otNumero} (${ot.vehiculo?.patente}) lleva ${dias} días sin diagnosticar.`,
          tiempo: `Hace ${dias} día${dias > 1 ? 's' : ''}`,
          otId: ot.id, otNumero: ot.otNumero,
          cliente: ot.vehiculo?.cliente?.razonSocial,
        });
      });
    }

    // OTs en trabajo >5 días
    if (showTrabajoProlongado) {
      const enTrabajoMucho = await prisma.ordenTrabajo.findMany({
        where: { ...tw, estado: 'EN_TRABAJO', fechaInicioTrabajo: { lt: cincoDiasAtras } },
        include: otInclude,
        orderBy: { fechaInicioTrabajo: 'asc' },
      });
      enTrabajoMucho.forEach((ot: any) => {
        const dias = Math.floor((now.getTime() - new Date(ot.fechaInicioTrabajo!).getTime()) / 86400000);
        alertas.push({
          tipo: 'trabajo_prolongado', nivel: 'advertencia',
          titulo: 'Trabajo prolongado',
          descripcion: `OT-${ot.otNumero} (${ot.vehiculo?.patente}) lleva ${dias} días en trabajo.`,
          tiempo: `Hace ${dias} día${dias > 1 ? 's' : ''}`,
          otId: ot.id, otNumero: ot.otNumero,
          cliente: ot.vehiculo?.cliente?.razonSocial,
        });
      });
    }

    // OTs por facturar
    if (showFinanzas) {
      const porFacturar = await prisma.ordenTrabajo.count({ where: { ...tw, estado: 'POR_FACTURAR' } });
      if (porFacturar > 0) {
        alertas.push({
          tipo: 'por_facturar', nivel: 'info',
          titulo: 'Por facturar',
          descripcion: `${porFacturar} OT${porFacturar > 1 ? 's' : ''} pendiente${porFacturar > 1 ? 's' : ''} de facturación.`,
          tiempo: 'Ahora',
        });
      }

      // Cuentas de clientes desactivadas (últimos 30 días)
      const cuentasDesactivadas = await prisma.eventoCliente.findMany({
        where: { tipoEvento: 'cuenta_desactivada', createdAt: { gt: treintaDiasAtras } },
        include: { cliente: { select: { id: true, razonSocial: true, activo: true } } },
        orderBy: { createdAt: 'desc' },
      });
      cuentasDesactivadas.forEach((ev: any) => {
        if (ev.cliente?.activo === false) {
          alertas.push({
            tipo: 'cuenta_desactivada', nivel: 'critico',
            titulo: 'Cuenta desactivada',
            descripcion: `${ev.cliente?.razonSocial} desactivó su cuenta del portal.`,
            tiempo: tiempoRelativo(new Date(ev.createdAt)),
            clienteId: ev.cliente?.id,
          });
        }
      });
    }

    return NextResponse.json({ alertas, total: alertas.length });
  } catch (err: any) {
    console.error('Alertas GET error:', err);
    return NextResponse.json({ alertas: [], total: 0 });
  }
}
