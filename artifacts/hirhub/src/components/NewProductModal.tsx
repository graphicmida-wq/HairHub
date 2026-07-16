import React, { useState } from 'react';
import { Modal } from './Modal';
import { CategoryInput } from './CategoryInput';
import { useCreateProduct, getListProductsQueryKey } from '@workspace/api-client-react';
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
  supplier?: string;
  notes?: string;
  trackByWeight: boolean;
  unitSize: number;
  unitType: UnitType;
  stockGrams: number;
}

const emptyForm: FormData = {
  name: '', category: '', brand: '', price: 0, quantity: 0, minThreshold: 5,
  trackByWeight: false, unitSize: 100, unitType: 'ml', stockGrams: 0,
};

export const NewProductModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const queryClient = useQueryClient();
  const { mutate: createProduct, isPending } = useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast.show('Prodotto aggiunto');
        onClose();
        setFormData(emptyForm);
        setStockGramsManual(false);
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { message?: string } })?.data?.message;
        toast.show(msg ?? 'Errore durante il salvataggio', 'error');
      },
    },
  });

  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [stockGramsManual, setStockGramsManual] = useState(false);

  const handleQuantityChange = (val: number) => {
    setStockGramsManual(false);
    setFormData(p => ({ ...p, quantity: val, stockGrams: p.trackByWeight ? val * p.unitSize : p.stockGrams }));
  };

  const handleUnitSizeChange = (val: number) => {
    setStockGramsManual(false);
    setFormData(p => ({ ...p, unitSize: val, stockGrams: p.quantity * val }));
  };

  const handleTrackByWeightChange = (checked: boolean) => {
    setFormData(p => {
      const newStock = checked ? p.quantity * p.unitSize : 0;
      return { ...p, trackByWeight: checked, stockGrams: newStock };
    });
    setStockGramsManual(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Parameters<typeof createProduct>[0]['data'] = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      brand: formData.brand.trim(),
      price: formData.price,
      quantity: formData.quantity,
      minThreshold: formData.minThreshold,
      supplier: formData.supplier || null,
      notes: formData.notes || null,
    };
    if (formData.trackByWeight) {
      payload.unitSize = formData.unitSize;
      payload.unitType = formData.unitType;
      payload.stockGrams = formData.stockGrams;
    }
    createProduct({ data: payload });
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
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Prezzo base (€)</label>
          <input
            required
            type="number"
            min="0"
            step="0.5"
            value={formData.price}
            onChange={e => setFormData(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))}
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
              onChange={e => setFormData(p => ({ ...p, minThreshold: parseInt(e.target.value) || 0 }))}
              className={INPUT} />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="trackByWeight"
            checked={formData.trackByWeight}
            onChange={e => handleTrackByWeightChange(e.target.checked)}
            className="w-4 h-4 rounded border-stone-300 accent-stone-800"
          />
          <label htmlFor="trackByWeight" className="text-sm text-stone-700 cursor-pointer">
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
                  onChange={e => setFormData(p => ({ ...p, unitType: e.target.value as UnitType }))}
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
                  setFormData(p => ({
                    ...p,
                    stockGrams: val,
                    quantity: p.trackByWeight ? getTrackedQuantity(p.quantity, p.unitSize, val) : p.quantity,
                  }));
                }}
                className={INPUT} />
              <p className="text-xs text-stone-400">
                {stockGramsManual
                  ? 'Valore personalizzato — modificare le confezioni per ricalcolare'
                  : `Auto-calcolato: ${formData.quantity} × ${formData.unitSize} ${formData.unitType}`}
              </p>
            </div>
          </div>
        )}

        <button
          type="submit" disabled={isPending}
          className="btn-brand mt-2 text-white font-medium py-3 rounded-xl disabled:opacity-60"
        >
          {isPending ? 'Salvataggio...' : 'Salva Prodotto'}
        </button>
      </form>
    </Modal>
  );
};
