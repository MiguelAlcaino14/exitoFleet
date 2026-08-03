import { ClienteDetalleClient } from './cliente-detalle-client';

export default function ClienteDetallePage({ params }: { params: { id: string } }) {
  return <ClienteDetalleClient clienteId={params.id} />;
}
