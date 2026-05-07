import React, { useState } from 'react';
import { Modal } from './Modal';
import { useCreateProduct, getListProductsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from './Toast';

export const NewProductModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const queryClient = useQueryClient();
  const { mutate: createProduct, isPending } = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast.show('Prodotto aggiunto');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? 'Errore durante il salvataggio', 'error');
      },
    },
  });

  const [formData, setFormData] = useState({ name: '', category: '', brand: '', quantity: 0, minThreshold: 5 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProduct({ data: formData });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuovo Prodotto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Nome Prodotto</label>
          <input required type="text" value={formData.name} onChange={e => setFormData(p => ({...p, name: e.target.value}))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Marca</label>
            <input required type="text" value={formData.brand} onChange={e => setFormData(p => ({...p, brand: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Categoria</label>
            <select required value={formData.category} onChange={e => setFormData(p => ({...p, category: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full">
              <option value="" disabled>Seleziona</option>
              <option value="Lavaggio">Lavaggio</option>
              <option value="Colore">Colore</option>
              <option value="Finish">Finish</option>
              <option value="Altro">Altro</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Quantità</label>
            <input required type="number" min="0" value={formData.quantity} onChange={e => setFormData(p => ({...p, quantity: parseInt(e.target.value) || 0}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Soglia Minima</label>
            <input required type="number" min="0" value={formData.minThreshold} onChange={e => setFormData(p => ({...p, minThreshold: parseInt(e.target.value) || 0}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
          </div>
        </div>
        <button type="submit" disabled={isPending} className="mt-4 bg-stone-900 text-white font-medium py-3 rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-60">
          {isPending ? 'Salvataggio...' : 'Salva Prodotto'}
        </button>
      </form>
    </Modal>
  );
};
