import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { CategoryInput } from './CategoryInput';
import { useListProducts, useUpdateProduct, useDeleteProduct, getListProductsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from './Toast';

const LABEL = "text-sm font-medium text-stone-700";
const INPUT = "bg-white border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full text-sm";
const SELECT = "bg-white border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full text-sm";

type UnitType = 'g' | 'ml';

function getTrackedQuantity(quantity: number, unitSize: number, stockGrams: number): number {
  return unitSize > 0 ? Math.max(0, Math.floor(stockGrams / unitSize)) : quantity;
}

interface FormData {
  name: string;
  category: string;
  brand: string;
  price: number;
  quantity: number;
  minThreshold: number;
  trackByWeight: boolean;
  unitSize: number;
  unitType: UnitType;
  stockGrams: number;
}

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
        const msg = (err as { data?: { message?: string } })?.data?.message;
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
        const msg = (err as { data?: { message?: string } })?.data?.message;
        toast.show(msg ?? "Errore durante l'eliminazione", 'error');
      },
    },
  });

  const [formData, setFormData] = useState<FormData>({
    name: '', category: '', brand: '', price: 0, quantity: 0, minThreshold: 5,
    trackByWeight: false, unitSize: 100, unitType: 'ml', stockGrams: 0,
  });
  const [stockGramsManual, setStockGramsManual] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        category: product.category,
        brand: product.brand,
        price: product.price ?? 0,
        quantity:
          product.unitSize != null && product.stockGrams != null
            ? getTrackedQuantity(product.quantity, product.unitSize, product.stockGrams)
            : product.quantity,
        minThreshold: product.minThreshold,
        trackByWeight: product.unitSize != null,
        unitSize: product.unitSize ?? 100,
        unitType: (product.unitType as UnitType) ?? 'ml',
        stockGrams: product.stockGrams ?? 0,
      });
      setStockGramsManual(false);
    }
  }, [product]);

  const handleQuantityChange = (val: number) => {
    setStockGramsManual(false);
    setFormData(pr => ({
      ...pr,
      quantity: val,
      stockGrams: pr.trackByWeight
        ? Math.max(0, pr.stockGrams + (val - pr.quantity) * pr.unitSize)
        : pr.stockGrams,
    }));
  };

  const handleUnitSizeChange = (val: number) => {
    setStockGramsManual(false);
    setFormData(pr => ({ ...pr, unitSize: val, stockGrams: pr.quantity * val }));
  };

  const handleTrackByWeightChange = (checked: boolean) => {
    setFormData(pr => {
      const newStock = checked ? pr.quantity * pr.unitSize : 0;
      return { ...pr, trackByWeight: checked, stockGrams: newStock };
    });
    setStockGramsManual(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    const payload: Parameters<typeof updateProduct>[0]['data'] = {
      name: formData.name,
      category: formData.category,
      brand: formData.brand,
      price: formData.price,
      quantity: formData.quantity,
      minThreshold: formData.minThreshold,
    };
    if (formData.trackByWeight) {
      payload.unitSize = formData.unitSize;
      payload.unitType = formData.unitType;
      payload.stockGrams = formData.stockGrams;
    } else {
      payload.unitSize = null;
      payload.unitType = null;
      payload.stockGrams = null;
    }
    updateProduct({ id: productId, data: payload });
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
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Prezzo base (€)</label>
          <input
            required
            type="number"
            min="0"
            step="0.5"
            value={formData.price}
            onChange={e => setFormData(pr => ({ ...pr, price: parseFloat(e.target.value) || 0 }))}
            className={INPUT}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Confezioni (pz)</label>
            <input required type="number" min="0" value={formData.quantity}
              onChange={e => handleQuantityChange(parseInt(e.target.value) || 0)}
              className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Soglia Minima</label>
            <input required type="number" min="0" value={formData.minThreshold}
              onChange={e => setFormData(pr => ({ ...pr, minThreshold: parseInt(e.target.value) || 0 }))}
              className={INPUT} />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="editTrackByWeight"
            checked={formData.trackByWeight}
            onChange={e => handleTrackByWeightChange(e.target.checked)}
            className="w-4 h-4 rounded border-stone-300 accent-stone-800"
          />
          <label htmlFor="editTrackByWeight" className="text-sm text-stone-700 cursor-pointer">
            Traccia stock in grammi / ml
          </label>
        </div>

        {formData.trackByWeight && (
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Dimensione confezione</label>
                <input type="number" min="0" step="0.1" value={formData.unitSize}
                  onChange={e => handleUnitSizeChange(parseFloat(e.target.value) || 0)}
                  className={INPUT} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Unità di misura</label>
                <select value={formData.unitType}
                  onChange={e => setFormData(pr => ({ ...pr, unitType: e.target.value as UnitType }))}
                  className={SELECT}>
                  <option value="ml">ml (millilitri)</option>
                  <option value="g">g (grammi)</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className={LABEL}>Stock attuale ({formData.unitType})</label>
              <input type="number" min="0" step="0.1" value={formData.stockGrams}
                onChange={e => {
                  const val = parseFloat(e.target.value) || 0;
                  setStockGramsManual(true);
                  setFormData(pr => ({
                    ...pr,
                    stockGrams: val,
                    quantity: pr.trackByWeight ? getTrackedQuantity(pr.quantity, pr.unitSize, val) : pr.quantity,
                  }));
                }}
                className={INPUT} />
              <p className="text-xs text-stone-400">
                {stockGramsManual
                  ? 'Valore personalizzato — cambiare le confezioni aggiunge/sottrae una confezione al totale'
                  : `Aggiungere/togliere confezioni aggiusta lo stock di ±${formData.unitSize} ${formData.unitType} alla volta`}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 mt-2">
          <button type="button" onClick={handleDelete} disabled={isDeleting}
            className="flex-1 bg-red-50 text-red-600 font-medium py-3 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60">
            {isDeleting ? '...' : 'Elimina'}
          </button>
          <button type="submit" disabled={isUpdating}
            className="btn-brand flex-[2] text-white font-medium py-3 rounded-xl disabled:opacity-60">
            {isUpdating ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
