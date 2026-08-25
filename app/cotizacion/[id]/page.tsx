import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';

const GRUPOS: Record<string, string> = {
  REPUESTO: 'Repuestos',
  INSUMO: 'Insumos',
  SERVICIO: 'Servicios',
  MANO_DE_OBRA: 'Mano de Obra',
  DESCUENTO: 'Descuentos',
};

export default async function CotizacionPage({ params }: { params: { id: string } }) {
  const ot = await prisma.ordenTrabajo.findUnique({
    where: { id: params.id },
    select: {
      otNumero: true,
      fechaIngreso: true,
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

  if (!ot) notFound();

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-CL');
  const totalNeto = ot.itemsValorizacion.reduce((acc, i) => acc + i.precioVenta * i.cantidad, 0);
  const iva = Math.round(totalNeto * 0.19);
  const totalConIva = totalNeto + iva;
  const otNum = String(ot.otNumero).padStart(6, '0');
  const tallerNombre = ot.taller?.razonSocial || ot.taller?.nombre || 'D Motor';
  const vehiculo = [ot.vehiculo?.marca, ot.vehiculo?.modelo, ot.vehiculo?.anio].filter(Boolean).join(' ');
  const fecha = ot.fechaIngreso.toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

  const gruposUsados = ['REPUESTO', 'INSUMO', 'SERVICIO', 'MANO_DE_OBRA', 'DESCUENTO'].filter(g =>
    ot.itemsValorizacion.some(i => i.tipo === g)
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden">

        {/* Encabezado */}
        <div className="bg-gray-900 px-8 py-6 flex items-center justify-between">
          <div>
            {ot.taller?.logoUrl ? (
              <img src={ot.taller.logoUrl} alt={tallerNombre} className="h-10 object-contain mb-1" />
            ) : (
              <div className="text-blue-400 text-xl font-black tracking-widest">{tallerNombre}</div>
            )}
            {ot.taller?.rut && (
              <div className="text-gray-400 text-xs mt-1">RUT: {ot.taller.rut}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-white text-xs font-semibold uppercase tracking-widest text-gray-400">Cotización</div>
            <div className="text-white text-2xl font-black">OT-{otNum}</div>
            <div className="text-gray-400 text-xs mt-1">{fecha}</div>
          </div>
        </div>

        <div className="px-8 py-6">

          {/* Datos vehículo y cliente */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vehículo</div>
              <div className="text-lg font-black text-gray-900">{ot.vehiculo?.patente ?? '—'}</div>
              <div className="text-sm text-gray-500">{vehiculo}</div>
              {ot.vehiculo?.motor && <div className="text-xs text-gray-400 mt-1">Motor: {ot.vehiculo.motor}</div>}
              {ot.vehiculo?.vin && <div className="text-xs text-gray-400 mt-0.5">VIN: {ot.vehiculo.vin}</div>}
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cliente</div>
              <div className="text-sm font-bold text-gray-900">{ot.vehiculo?.cliente?.razonSocial ?? '—'}</div>
              {ot.vehiculo?.cliente?.rutEmpresa && (
                <div className="text-xs text-gray-500 mt-0.5">RUT: {ot.vehiculo.cliente.rutEmpresa}</div>
              )}
              {ot.vehiculo?.cliente?.direccion && (
                <div className="text-xs text-gray-500 mt-0.5">{ot.vehiculo.cliente.direccion}</div>
              )}
              {ot.vehiculo?.cliente?.telefono && (
                <div className="text-xs text-gray-500 mt-0.5">Tel: {ot.vehiculo.cliente.telefono}</div>
              )}
              {ot.vehiculo?.cliente?.email && (
                <div className="text-xs text-gray-500 mt-0.5">{ot.vehiculo.cliente.email}</div>
              )}
            </div>
          </div>

          {/* Items por grupo */}
          <div className="mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="px-3 py-2 text-left text-xs font-bold tracking-wider">Descripción</th>
                  <th className="px-3 py-2 text-center text-xs font-bold tracking-wider w-16">Ctd.</th>
                  <th className="px-3 py-2 text-right text-xs font-bold tracking-wider w-24">P. Unit.</th>
                  <th className="px-3 py-2 text-right text-xs font-bold tracking-wider w-24">Total</th>
                </tr>
              </thead>
              <tbody>
                {gruposUsados.map(grupo => {
                  const lineas = ot.itemsValorizacion.filter(i => i.tipo === grupo);
                  const subtotal = lineas.reduce((a, i) => a + i.precioVenta * i.cantidad, 0);
                  return (
                    <>
                      <tr key={`header-${grupo}`} className="bg-blue-50">
                        <td colSpan={4} className="px-3 py-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
                          {GRUPOS[grupo]}
                        </td>
                      </tr>
                      {lineas.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-800">{item.descripcion}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{item.cantidad}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{fmt(item.precioVenta)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-800">{fmt(Math.round(item.precioVenta * item.cantidad))}</td>
                        </tr>
                      ))}
                      <tr key={`sub-${grupo}`} className="border-b-2 border-gray-200">
                        <td colSpan={3} className="px-3 py-1.5 text-right text-xs text-gray-400">Subtotal {GRUPOS[grupo]}:</td>
                        <td className="px-3 py-1.5 text-right text-xs font-bold text-blue-700">{fmt(subtotal)}</td>
                      </tr>
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="bg-gray-900 rounded-lg p-5 mb-6">
            <div className="flex justify-between text-gray-300 text-sm mb-2">
              <span>Total Neto</span><span className="font-bold text-white">{fmt(totalNeto)}</span>
            </div>
            <div className="flex justify-between text-gray-500 text-sm mb-3">
              <span>IVA (19%)</span><span>{fmt(iva)}</span>
            </div>
            <div className="border-t border-gray-700 pt-3 flex justify-between">
              <span className="text-blue-400 font-bold text-base">Total con IVA</span>
              <span className="text-white font-black text-xl">{fmt(totalConIva)}</span>
            </div>
          </div>

          {/* Contacto taller */}
          {(ot.taller?.telefono || ot.taller?.email || ot.taller?.direccion) && (
            <div className="border-t border-gray-100 pt-4 text-xs text-gray-400 space-y-1">
              <div className="font-semibold text-gray-600 mb-2">{tallerNombre}</div>
              {ot.taller?.direccion && <div>{ot.taller.direccion}</div>}
              {ot.taller?.telefono && <div>Tel: {ot.taller.telefono}</div>}
              {ot.taller?.email && <div>{ot.taller.email}</div>}
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center text-xs text-gray-400">
          Este documento es una cotización y no constituye una factura.
        </div>
      </div>
    </div>
  );
}
