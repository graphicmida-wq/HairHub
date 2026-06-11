import React from 'react';
import { Modal } from './Modal';
import { useListAppointments, useListClients, useListServices, useListProducts, useDeleteAppointment, getListAppointmentsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Clock, Calendar, Text, CheckCircle2, Edit2, Trash2, Box } from 'lucide-react';
import { toast } from './Toast';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { addMinsToTime } from '../lib/utils';
import { ClientInfoPanel } from './ClientInfoPanel';

export const ManageAppointmentModal = ({
  isOpen,
  onClose,
  appointmentId,
  onEdit,
  onComplete
}: {
  isOpen: boolean,
  onClose: () => void,
  appointmentId: string | null,
  onEdit: (id: string) => void,
  onComplete: (id: string) => void
}) => {
  const queryClient = useQueryClient();
  const { data: appointments = [] } = useListAppointments();
  const { data: clients = [] } = useListClients();
  const { data: services = [] } = useListServices();
  const { data: products = [] } = useListProducts();
  const [isClientInfoOpen, setIsClientInfoOpen] = React.useState(false);

  const { mutate: deleteAppointment } = useDeleteAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast.show('Appuntamento eliminato');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { message?: string } })?.data?.message;
        toast.show(msg ?? "Errore durante l'eliminazione", 'error');
      },
    },
  });

  const appointment = appointments.find(a => a.id === appointmentId);
  const client = clients.find(c => c.id === appointment?.clientId);
  const appointmentServices = (appointment?.serviceIds ?? [])
    .map(sid => services.find(s => s.id === sid))
    .filter(Boolean) as typeof services;

  if (!appointment || !client || appointmentServices.length === 0) return null;

  const handleDelete = () => {
    if (window.confirm('Sei sicuro di voler eliminare questo appuntamento?')) {
      deleteAppointment({ id: appointment.id });
    }
  };

  const usedProds = appointment.usedProductIds
    ? appointment.usedProductIds.map(pid => products.find(p => p.id === pid)?.name).filter(Boolean)
    : [];

  const servicesTotal = (appointment.serviceIds ?? []).reduce((sum, sid, i) => {
    const v = appointment.servicePrices?.[i];
    if (typeof v === 'number' && Number.isFinite(v)) return sum + v;
    return sum + Number(services.find(s => s.id === sid)?.price ?? 0);
  }, 0);

  const soldTotal = (appointment.soldProducts ?? []).reduce((sum, sp) => {
    if (sp.quantity > 0) return sum + sp.quantity * sp.unitPrice;
    return sum;
  }, 0);

  const grandTotal = servicesTotal + soldTotal;

  const soldProds = appointment.soldProducts?.length
    ? appointment.soldProducts
        .map(sp => ({
          ...sp,
          name: products.find(p => p.id === sp.productId)?.name ?? 'Prodotto',
        }))
        .filter(sp => sp.quantity > 0)
    : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Dettagli Appuntamento">
      <div className="flex flex-col gap-6">

        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-serif text-2xl text-stone-900">{client.firstName} {client.lastName}</h3>
            <button
              type="button"
              onClick={() => setIsClientInfoOpen(true)}
              className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors mt-1"
            >
              Info cliente
            </button>
            <div className="flex flex-wrap gap-1 mt-1">
              {appointmentServices.map((svc, idx) => {
                const listPrice = appointment.serviceListPrices?.[idx] ?? svc.price;
                const applied = appointment.servicePrices?.[idx];
                const appliedPrice =
                  typeof applied === 'number' && Number.isFinite(applied) ? applied : listPrice;
                return (
                  <span key={svc.id} className="text-sm font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
                    {svc.name} · {appliedPrice}€ <span className="text-stone-400 text-xs">(listino {listPrice}€)</span>
                  </span>
                );
              })}
            </div>
            <div className="mt-2 bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-600">Totale servizi</span>
                <span className="font-semibold text-stone-900">€{servicesTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-600">Prodotti venduti</span>
                <span className="font-semibold text-stone-900">€{soldTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-700 font-medium">Totale finale</span>
                <span className="font-semibold text-stone-900">€{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-sm ${
            appointment.status === 'completato' ? 'bg-green-100 text-green-700' :
            appointment.status === 'annullato' || appointment.status === 'no-show' ? 'bg-red-100 text-red-700' :
            'bg-yellow-100 text-yellow-700'
          }`}>
            {appointment.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-icon-color)' }}>
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-semibold text-stone-400 block tracking-wider">Data</span>
              <span className="font-medium text-stone-900">{format(new Date(appointment.date), 'dd MMM yyyy', { locale: it })}</span>
            </div>
          </div>
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-icon-color)' }}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-semibold text-stone-400 block tracking-wider">Orario</span>
              <span className="font-semibold text-stone-900 text-lg leading-tight">
                {appointment.time} → {addMinsToTime(appointment.time, appointment.durationMins)}
              </span>
              <span className="text-xs text-stone-400 block">{appointment.durationMins} min</span>
            </div>
          </div>
        </div>

        {(appointment.notes || usedProds.length > 0 || soldProds.length > 0) && (
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex flex-col gap-3">
            {appointment.notes && (
              <div>
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Text className="w-3 h-3" /> Note</span>
                <p className="text-sm text-stone-800">{appointment.notes}</p>
              </div>
            )}
            {usedProds.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Box className="w-3 h-3" /> Prodotti Utilizzati</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {usedProds.map((p, i) => (
                    <span key={i} className="text-xs bg-white text-stone-600 px-2 py-0.5 rounded-full border border-stone-200">{p}</span>
                  ))}
                </div>
              </div>
            )}
            {soldProds.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Box className="w-3 h-3" /> Prodotti Venduti</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {soldProds.map((p) => (
                    <span key={p.productId} className="text-xs bg-white text-stone-600 px-2 py-0.5 rounded-full border border-stone-200">
                      {p.name} × {p.quantity} · {p.unitPrice}€
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 mt-2">
          {appointment.status !== 'completato' && (
            <button
              onClick={() => { onClose(); onComplete(appointment.id); }}
              className="w-full text-white font-medium py-3.5 rounded-xl hover:bg-green-500 transition-colors flex items-center justify-center gap-2 shadow-sm bg-[#538c67]"
            >
              <CheckCircle2 className="w-5 h-5" /> Segna come Completato
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { onClose(); onEdit(appointment.id); }}
              className="flex-1 bg-stone-100 text-stone-900 font-medium py-3 rounded-xl hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
            >
              <Edit2 className="w-4 h-4" /> Modifica
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 bg-red-50 text-red-600 font-medium py-3 rounded-xl hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Elimina
            </button>
          </div>
        </div>

      </div>

      <ClientInfoPanel
        open={isClientInfoOpen}
        onOpenChange={setIsClientInfoOpen}
        client={client}
      />
    </Modal>
  );
}
