import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  useListServices,
  useUpdateService,
  useDeleteService,
  getListServicesQueryKey,
  getListAppointmentsQueryKey,
} from '@workspace/api-client-react';
import { CategoryInput } from './CategoryInput';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from './Toast';

export const EditServiceModal = ({
  isOpen,
  onClose,
  serviceId,
}: {
  isOpen: boolean;
  onClose: () => void;
  serviceId: string | null;
}) => {
  const queryClient = useQueryClient();
  const { data: services = [] } = useListServices();
  const service = services.find(s => s.id === serviceId);

  const { mutate: updateService, isPending: isUpdating } = useUpdateService({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        toast.show('Servizio aggiornato');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? 'Errore durante il salvataggio', 'error');
      },
    },
  });

  const { mutate: deleteService, isPending: isDeleting } = useDeleteService({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast.show('Servizio eliminato');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? "Errore durante l'eliminazione", 'error');
      },
    },
  });

  const [formData, setFormData] = useState({
    name: '', category: '', durationMins: '', price: '', notes: '',
  });

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        category: service.category,
        durationMins: String(service.durationMins),
        price: String(service.price),
        notes: service.notes ?? '',
      });
    }
  }, [service]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) return;
    updateService({
      id: serviceId,
      data: {
        name: formData.name,
        category: formData.category,
        durationMins: Number(formData.durationMins),
        price: Number(formData.price),
        notes: formData.notes || null,
      },
    });
  };

  const handleDelete = () => {
    if (!serviceId || !window.confirm('Sei sicuro di voler eliminare questo servizio?')) return;
    deleteService({ id: serviceId });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifica Servizio">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Nome servizio</label>
          <input
            required
            type="text"
            value={formData.name}
            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Categoria</label>
          <CategoryInput
            required
            source="services"
            value={formData.category}
            onChange={v => setFormData(p => ({ ...p, category: v }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Durata (min)</label>
            <input
              required
              type="number"
              min="5"
              step="5"
              value={formData.durationMins}
              onChange={e => setFormData(p => ({ ...p, durationMins: e.target.value }))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Prezzo (€)</label>
            <input
              required
              type="number"
              min="0"
              step="0.50"
              value={formData.price}
              onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Note</label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full resize-none"
          />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1 bg-red-50 text-red-600 font-medium py-3 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60"
          >
            {isDeleting ? '...' : 'Elimina'}
          </button>
          <button
            type="submit"
            disabled={isUpdating}
            className="btn-brand flex-[2] text-white font-medium py-3 rounded-xl disabled:opacity-60"
          >
            {isUpdating ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
