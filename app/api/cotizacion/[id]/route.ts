export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Endpoint público — accesible desde el link del email.
// El CUID (25 chars) actúa como token opaco: impredecible, no secuencial.
// Solo expone datos mínimos necesarios para mostrar la cotización al cliente.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ot = await prisma.ordenTrabajo.findUnique({
      where: { id: params.id },
      select: {
        cotizacionExpiresAt: true,
        otNumero: true,
        vehiculo: {
          select: {
            patente: true,
            marca: true,
            modelo: true,
            anio: true,
            cliente: { select: { razonSocial: true, rutEmpresa: true, direccion: true, email: true, telefono: true } },
            vin: true,
            motor: true,
          },
        },
        itemsValorizacion: {
          select: { tipo: true, descripcion: true, cantidad: true, precioVenta: true },
          orderBy: { createdAt: 'asc' },
        },
        taller: {
          select: {
            nombre: true,
            razonSocial: true,
            rut: true,
            telefono: true,
            email: true,
            direccion: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!ot) return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 });

    if (ot.cotizacionExpiresAt && new Date() > ot.cotizacionExpiresAt) {
      return NextResponse.json({ error: 'El enlace de esta cotización ha expirado. Contacte al taller para obtener uno nuevo.' }, { status: 410 });
    }

    const totalNeto = ot.itemsValorizacion.reduce((acc, i) => acc + i.precioVenta * i.cantidad, 0);
    const iva = Math.round(totalNeto * 0.19);

    return NextResponse.json({
      otNumero: ot.otNumero,
      patente: ot.vehiculo?.patente ?? '',
      vehiculo: [ot.vehiculo?.marca, ot.vehiculo?.modelo, ot.vehiculo?.anio].filter(Boolean).join(' '),
      cliente: {
        nombre: ot.vehiculo?.cliente?.razonSocial ?? '',
        rut: ot.vehiculo?.cliente?.rutEmpresa ?? '',
        direccion: ot.vehiculo?.cliente?.direccion ?? '',
        email: ot.vehiculo?.cliente?.email ?? '',
        telefono: ot.vehiculo?.cliente?.telefono ?? '',
      },
      taller: {
        nombre: ot.taller?.razonSocial || ot.taller?.nombre || 'D Motor',
        rut: ot.taller?.rut ?? '',
        telefono: ot.taller?.telefono ?? '',
        email: ot.taller?.email ?? '',
        direccion: ot.taller?.direccion ?? '',
        logoUrl: ot.taller?.logoUrl ?? '',
      },
      items: ot.itemsValorizacion.map(i => ({
        tipo: i.tipo,
        descripcion: i.descripcion,
        cantidad: i.cantidad,
        precioVenta: i.precioVenta,
        total: Math.round(i.precioVenta * i.cantidad),
      })),
      totalNeto,
      iva,
      totalConIva: totalNeto + iva,
    });
  } catch (err: any) {
    console.error('Cotizacion GET error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
