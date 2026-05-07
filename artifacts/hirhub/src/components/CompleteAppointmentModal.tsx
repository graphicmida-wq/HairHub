import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useListAppointments, useListClients, useListServices, useListProducts, useUpdateAppointment, useUpdateProduct, getListAppointmentsQueryKey, getListProductsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, Box, CheckCircle2 } from 'lucide-react';
import { toast } from './Toast';
import { format } from 'date-fns';

export const CompleteAppointmentModal = ({ isOpen, onClose, appointmentId }: { isOpen: boolean, onClose: () => void, appointmentId: string | null }) => {
  const queryClient = useQueryClient();
  const { data: appointments = [] } = useListAppointments();
  const { data: clients = [] } = useListClients();
  const { data: services = [] } = useListServices();
  const { data: products = [] } = useListProducts();

  const { mutate: updateAppointment } = useUpdateAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast.show('Appuntamento completato');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? 'Errore durante il completamento', 'error');
      },
    },
  });
  const { mutateAsync: updateProduct } = useUpdateProduct();

  const appointment = appointments.find(a => a.id === appointmentId);
  const client = clients.find(c => c.id === appointment?.clientId);
  const service = services.find(s => s.id === appointment?.serviceId);

  const [notes, setNotes] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (appointment) {
      setNotes(appointment.notes || '');
      setSelectedProductIds(appointment.usedProductIds || []);
    }
  }, [appointment]);

  if (!appointment || !client || !service) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await Promise.all(
      selectedProductIds.map(pid => {
        const p = products.find(prod => prod.id === pid);
        if (p) {
          return updateProduct({ id: pid, data: { quantity: Math.max(0, p.quantity - 1) } });
        }
        return Promise.resolve();
      })
    );

    updateAppointment({ id: appointment.id, data: {
      status: 'completato',
      notes: notes || null,
      usedProductIds: selectedProductIds,
    }});
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleProduct = (id: string) => {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Completa Appuntamento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex flex-col gap-2">
          <h4 className="font-serif text-lg text-stone-900">{client.firstName} {client.lastName}</h4>
          <div className="flex flex-col gap-1 text-sm text-stone-600">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(appointment.date), 'dd/MM/yyyy')} &bull; {appointment.time}</span>
            <span className="flex items-center gap-1 font-medium"><Box className="w-4 h-4" /> {service.name}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Note del servizio</label>
          <textarea
            rows={3}
            placeholder="Aggiungi eventuali note tecniche, preferenze per la prossima volta, ecc..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full resize-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-stone-700">Prodotti Utilizzati</label>
          <input
            type="text"
            placeholder="Cerca prodotto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 outline-none focus:border-brand-dark transition-colors text-sm"
          />
          <div className="max-h-40 overflow-y-auto border border-stone-100 rounded-xl flex flex-col bg-white">
            {filteredProducts.map(p => (
              <div
                key={p.id}
                onClick={() => toggleProduct(p.id)}
                className="p-3 border-b border-stone-50 flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-sm text-stone-900">{p.name}</div>
                  <div className="text-xs text-stone-500">{p.brand} ({p.quantity} pz rimanenti)</div>
                </div>
                <div className="w-5 h-5 rounded border border-stone-300 flex items-center justify-center text-white shrink-0" style={{backgroundColor: selectedProductIds.includes(p.id) ? '#1c1917' : 'transparent', borderColor: selectedProductIds.includes(p.id) ? '#1c1917' : '#d6d3d1'}}>
                  {selectedProductIds.includes(p.id) && <CheckCircle2 className="w-4 h-4" />}
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && <div className="p-3 text-sm text-stone-500 text-center">Nessun prodotto trovato</div>}
          </div>
        </div>

        <button type="submit" className="mt-2 bg-green-600 text-white font-medium py-3 rounded-xl hover:bg-green-500 transition-colors flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5" /> Conferma Completamento
        </button>
      </form>
    </Modal>
  );
}
