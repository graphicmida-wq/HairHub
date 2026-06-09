import React, { useState } from 'react';
import { Modal } from './Modal';
import { useCreateService, getListServicesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from './Toast';
import { CategoryInput } from './CategoryInput';

export const NewServiceModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const { mutate: createService, isPending } = useCreateService({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
        toast.show('Servizio aggiunto con successo');
        onClose();
        setFormData({ name: '', category: '', color: '#94a3b8', durationMins: '', price: '', notes: '' });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? 'Errore durante il salvataggio', 'error');
      },
    },
  });

  const [formData, setFormData] = useState({
    name: '', category: '', color: '#94a3b8', durationMins: '', price: '', notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createService({
      data: {
        name: formData.name,
        category: formData.category,
        color: formData.color,
        durationMins: Number(formData.durationMins),
        price: Number(formData.price),
        notes: formData.notes || null,
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuovo Servizio">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Nome servizio</label>
          <input
            required
            type="text"
            placeholder="Es. Taglio + Piega"
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
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Colore</label>
          <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5">
            <input
              type="color"
              value={formData.color}
              onChange={e => setFormData(p => ({ ...p, color: e.target.value }))}
              className="h-8 w-10 p-0 bg-transparent border-0"
            />
            <input
              type="text"
              value={formData.color}
              onChange={e => setFormData(p => ({ ...p, color: e.target.value }))}
              className="flex-1 bg-transparent outline-none text-sm text-stone-700"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Durata (min)</label>
            <input
              required
              type="number"
              min="5"
              step="5"
              placeholder="60"
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
              placeholder="35.00"
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
            placeholder="Note opzionali..."
            value={formData.notes}
            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="btn-brand mt-4 text-white font-medium py-3 rounded-xl disabled:opacity-60"
        >
          {isPending ? 'Salvataggio...' : 'Salva Servizio'}
        </button>
      </form>
    </Modal>
  );
};
