import React, { useState } from 'react';
import { Modal } from './Modal';
import { CategoryInput } from './CategoryInput';
import { useCreateProduct, getListProductsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from './Toast';

const LABEL = "text-sm font-medium text-stone-700";
const INPUT = "bg-white border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full text-sm";

export const NewProductModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const queryClient = useQueryClient();
  const { mutate: createProduct, isPending } = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast.show('Prodotto aggiunto');
        onClose();
        setFormData({ name: '', category: '', brand: '', quantity: 0, minThreshold: 5 });
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
          <label className={LABEL}>Nome Prodotto</label>
          <input required type="text" value={formData.name}
            onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Marca</label>
            <input required type="text" value={formData.brand}
              onChange={e => setFormData(p => ({ ...p, brand: e.target.value }))}
              className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Categoria</label>
            <CategoryInput
              required
              value={formData.category}
              onChange={val => setFormData(p => ({ ...p, category: val }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Quantità</label>
            <input required type="number" min="0" value={formData.quantity}
              onChange={e => setFormData(p => ({ ...p, quantity: parseInt(e.target.value) || 0 }))}
              className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Soglia Minima</label>
            <input required type="number" min="0" value={formData.minThreshold}
              onChange={e => setFormData(p => ({ ...p, minThreshold: parseInt(e.target.value) || 0 }))}
              className={INPUT} />
          </div>
        </div>
        <button
          type="submit" disabled={isPending}
          className="mt-4 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-brand-dark)' }}
        >
          {isPending ? 'Salvataggio...' : 'Salva Prodotto'}
        </button>
      </form>
    </Modal>
  );
};
