import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { CategoryInput } from './CategoryInput';
import { useListProducts, useUpdateProduct, useDeleteProduct, getListProductsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from './Toast';

const LABEL = "text-sm font-medium text-stone-700";
const INPUT = "bg-white border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full text-sm";

export const EditProductModal = ({ isOpen, onClose, productId }: { isOpen: boolean, onClose: () => void, productId: string | null }) => {
  const queryClient = useQueryClient();
  const { data: products = [] } = useListProducts();
  const product = products.find(p => p.id === productId);

  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast.show('Prodotto aggiornato');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? 'Errore durante il salvataggio', 'error');
      },
    },
  });

  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast.show('Prodotto eliminato');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? "Errore durante l'eliminazione", 'error');
      },
    },
  });

  const [formData, setFormData] = useState({ name: '', category: '', brand: '', quantity: 0, minThreshold: 5 });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name, category: product.category,
        brand: product.brand, quantity: product.quantity, minThreshold: product.minThreshold,
      });
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    updateProduct({ id: productId, data: formData });
  };

  const handleDelete = () => {
    if (!productId || !window.confirm('Sei sicuro di voler eliminare questo prodotto?')) return;
    deleteProduct({ id: productId });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifica Prodotto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Nome Prodotto</label>
          <input required type="text" value={formData.name}
            onChange={e => setFormData(pr => ({ ...pr, name: e.target.value }))}
            className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Marca</label>
            <input required type="text" value={formData.brand}
              onChange={e => setFormData(pr => ({ ...pr, brand: e.target.value }))}
              className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Categoria</label>
            <CategoryInput
              required
              value={formData.category}
              onChange={val => setFormData(pr => ({ ...pr, category: val }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Quantità</label>
            <input required type="number" min="0" value={formData.quantity}
              onChange={e => setFormData(pr => ({ ...pr, quantity: parseInt(e.target.value) || 0 }))}
              className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Soglia Minima</label>
            <input required type="number" min="0" value={formData.minThreshold}
              onChange={e => setFormData(pr => ({ ...pr, minThreshold: parseInt(e.target.value) || 0 }))}
              className={INPUT} />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button type="button" onClick={handleDelete} disabled={isDeleting}
            className="flex-1 bg-red-50 text-red-600 font-medium py-3 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60">
            {isDeleting ? '...' : 'Elimina'}
          </button>
          <button type="submit" disabled={isUpdating}
            className="flex-[2] text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#3A3748' }}>
            {isUpdating ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
