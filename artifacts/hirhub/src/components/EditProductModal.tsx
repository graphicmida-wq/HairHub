import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useListProducts, useUpdateProduct, useDeleteProduct, getListProductsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export const EditProductModal = ({ isOpen, onClose, productId }: { isOpen: boolean, onClose: () => void, productId: string | null }) => {
  const queryClient = useQueryClient();
  const { data: products = [] } = useListProducts();
  const product = products.find(p => p.id === productId);

  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        onClose();
      },
    },
  });

  const { mutate: deleteProduct, isPending: isDeleting } = useDeleteProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        onClose();
      },
    },
  });

  const [formData, setFormData] = useState({ name: '', category: '', brand: '', quantity: 0, minThreshold: 5 });

  useEffect(() => {
    if (product) {
      setFormData({ name: product.name, category: product.category, brand: product.brand, quantity: product.quantity, minThreshold: product.minThreshold });
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
          <label className="text-sm font-medium text-stone-700">Nome Prodotto</label>
          <input required type="text" value={formData.name} onChange={e => setFormData(pr => ({...pr, name: e.target.value}))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Marca</label>
            <input required type="text" value={formData.brand} onChange={e => setFormData(pr => ({...pr, brand: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Categoria</label>
            <select required value={formData.category} onChange={e => setFormData(pr => ({...pr, category: e.target.value}))}
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
            <input required type="number" min="0" value={formData.quantity} onChange={e => setFormData(pr => ({...pr, quantity: parseInt(e.target.value) || 0}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Soglia Minima</label>
            <input required type="number" min="0" value={formData.minThreshold} onChange={e => setFormData(pr => ({...pr, minThreshold: parseInt(e.target.value) || 0}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button type="button" onClick={handleDelete} disabled={isDeleting}
            className="flex-1 bg-red-50 text-red-600 font-medium py-3 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60">
            {isDeleting ? '...' : 'Elimina'}
          </button>
          <button type="submit" disabled={isUpdating}
            className="flex-[2] bg-stone-900 text-white font-medium py-3 rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-60">
            {isUpdating ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
