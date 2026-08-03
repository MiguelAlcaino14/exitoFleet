import { OTDetalleClient } from './ot-detalle-client';

export const dynamic = 'force-dynamic';

export default function OTDetallePage({ params }: { params: { id: string } }) {
  return <OTDetalleClient otId={params?.id ?? ''} />;
}
