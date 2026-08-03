export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTallerScope, tallerWhere } from '@/lib/taller';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const now = new Date();
    const tresDiasAtras = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const cincosDiasAtras = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

    const scope = await getTallerScope();
    const tw = tallerWhere(scope!);

    // OTs esperando aprobación por más de 3 días
    const sinAprobar = await prisma.ordenTrabajo.findMany({
      where: {
        ...tw,
        estado: 'ESPERANDO_APROBACION',
        fechaValorizacion: { lt: tresDiasAtras },
      },
      include: { vehiculo: { select: { patente: true, cliente: { select: { razonSocial: true } } } } },
      orderBy: { fechaValorizacion: 'asc' },
    });

    // OTs por diagnosticar hace más de 2 días
    const sinDiagnostico = await prisma.ordenTrabajo.findMany({
      where: {
        ...tw,
        estado: 'POR_DIAGNOSTICAR',
        fechaIngreso: { lt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
      },
      include: { vehiculo: { select: { patente: true, cliente: { select: { razonSocial: true } } } } },
      orderBy: { fechaIngreso: 'asc' },
    });

    // OTs en trabajo hace más de 5 días
    const enTrabajoMucho = await prisma.ordenTrabajo.findMany({
      where: {
        ...tw,
        estado: 'EN_TRABAJO',
        fechaInicioTrabajo: { lt: cincosDiasAtras },
      },
      include: { vehiculo: { select: { patente: true, cliente: { select: { razonSocial: true } } } } },
      orderBy: { fechaInicioTrabajo: 'asc' },
    });

    // OTs por facturar (siempre alerta)
    const porFacturar = await prisma.ordenTrabajo.count({ where: { ...tw, estado: 'POR_FACTURAR' } });

    // Clientes que desactivaron su cuenta en los últimos 30 días
    const treintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cuentasDesactivadas = await prisma.eventoCliente.findMany({
      where: { tipoEvento: 'cuenta_desactivada', createdAt: { gt: treintaDiasAtras } },
      include: { cliente: { select: { id: true, razonSocial: true, activo: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const alertas: any[] = [];

    cuentasDesactivadas.forEach((ev: any) => {
      if (ev.cliente?.activo === false) {
        const dias = Math.floor((now.getTime() - new Date(ev.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        alertas.push({
          tipo: 'cuenta_desactivada', nivel: 'critico',
          mensaje: `${ev.cliente?.razonSocial} desactivó su cuenta del portal${dias === 0 ? ' hoy' : ` hace ${dias} día${dias > 1 ? 's' : ''}`}`,
          clienteId: ev.cliente?.id,
          cliente: ev.cliente?.razonSocial,
        });
      }
    });

    sinAprobar.forEach((ot: any) => {
      const dias = Math.floor((now.getTime() - new Date(ot.fechaValorizacion).getTime()) / (1000 * 60 * 60 * 24));
      alertas.push({
        tipo: 'sin_aprobar', nivel: 'critico',
        mensaje: `OT-${ot.otNumero} (${ot.vehiculo?.patente}) lleva ${dias} días sin aprobar`,
        otId: ot.id, otNumero: ot.otNumero, dias,
        cliente: ot.vehiculo?.cliente?.razonSocial,
      });
    });

    sinDiagnostico.forEach((ot: any) => {
      const dias = Math.floor((now.getTime() - new Date(ot.fechaIngreso).getTime()) / (1000 * 60 * 60 * 24));
      alertas.push({
        tipo: 'sin_diagnostico', nivel: 'advertencia',
        mensaje: `OT-${ot.otNumero} (${ot.vehiculo?.patente}) lleva ${dias} días sin diagnosticar`,
        otId: ot.id, otNumero: ot.otNumero, dias,
        cliente: ot.vehiculo?.cliente?.razonSocial,
      });
    });

    enTrabajoMucho.forEach((ot: any) => {
      const dias = Math.floor((now.getTime() - new Date(ot.fechaInicioTrabajo!).getTime()) / (1000 * 60 * 60 * 24));
      alertas.push({
        tipo: 'trabajo_prolongado', nivel: 'advertencia',
        mensaje: `OT-${ot.otNumero} (${ot.vehiculo?.patente}) lleva ${dias} días en trabajo`,
        otId: ot.id, otNumero: ot.otNumero, dias,
        cliente: ot.vehiculo?.cliente?.razonSocial,
      });
    });

    if (porFacturar > 0) {
      alertas.push({
        tipo: 'por_facturar', nivel: 'info',
        mensaje: `${porFacturar} OT${porFacturar > 1 ? 's' : ''} pendiente${porFacturar > 1 ? 's' : ''} de facturación`,
      });
    }

    return NextResponse.json({ alertas, total: alertas.length });
  } catch (err: any) {
    console.error('Alertas GET error:', err);
    return NextResponse.json({ alertas: [], total: 0 });
  }
}
