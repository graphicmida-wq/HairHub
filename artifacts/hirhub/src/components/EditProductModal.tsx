import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, ChevronRight } from 'lucide-react';
import { Modal } from './Modal';
import { CategoryInput } from './CategoryInput';
import { BrandInput, NewBrandColorField } from './BrandInput';
import { SubcategoryInput } from './SubcategoryInput';
import { useSaveBrandColor } from '../lib/product-brand-colors';
import {
  useListProducts, useUpdateProduct, useDeleteProduct, useDeleteProductMovements, useListStockMovements,
  getListProductsQueryKey, getListStockMovementsQueryKey, type StockMovementReason,
} from '@workspace/api-client-react';
import { useAuth } from '../lib/auth-context';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from './Toast';
import { MANUAL_REASONS, formatNumber, invalidateStock } from '../lib/stock';

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
  subcategories: string[];
}

export const EditProductModal = ({ isOpen, onClose, productId }: { isOpen: boolean, onClose: () => void, productId: string | null }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: products = [] } = useListProducts();
  const product = products.find(p => p.id === productId);

  const { mutate: saveBrandColor } = useSaveBrandColor();
  const { mutate: updateProduct, isPending: isUpdating } = useUpdateProduct({
    mutation: {
      onSuccess: (updated) => {
        if (newBrandColor) saveBrandColor({ data: { brand: updated.brand, color: newBrandColor } });
        setNewBrandColor(null);
        invalidateStock(queryClient);
        toast.show('Prodotto aggiornato');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { message?: string } })?.data?.message;
        toast.show(msg ?? 'Errore durante il salvataggio', 'error');
      },
    },
  });

  const { mutateAsync: deleteProduct, isPending: isDeletingProduct } = useDeleteProduct();
  const { mutateAsync: deleteHistory, isPending: isDeletingHistory } = useDeleteProductMovements();
  const isDeleting = isDeletingProduct || isDeletingHistory;

  // Deleting: an admin may take the product's history with it (a product created
  // by mistake or for a test); appointment movements always stay
  const { isAdmin } = useAuth();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [withHistory, setWithHistory] = useState(false);
  const historyParams = { productId: productId ?? '' };
  const { data: history = [], isLoading: loadingHistory } = useListStockMovements(historyParams, {
    query: { queryKey: getListStockMovementsQueryKey(historyParams), enabled: isAdmin && confirmingDelete && !!productId },
  });
  const deletable = history.filter(m => !m.appointmentId);
  const deletableSales = new Set(deletable.filter(m => m.saleId && m.quantity < 0).map(m => m.saleId)).size;
  const keptForAppointments = history.length - deletable.length;
  useEffect(() => {
    if (!isOpen) { setConfirmingDelete(false); setWithHistory(false); }
  }, [isOpen]);

  const [formData, setFormData] = useState<FormData>({
    name: '', category: '', brand: '', price: 0, quantity: 0, minThreshold: 5,
    trackByWeight: false, unitSize: 100, unitType: 'ml', stockGrams: 0, subcategories: [],
  });
  const [stockGramsManual, setStockGramsManual] = useState(false);
  const [stockReason, setStockReason] = useState<StockMovementReason | null>(null);
  const [stockNote, setStockNote] = useState('');
  const [newBrandColor, setNewBrandColor] = useState<string | null>(null);

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
        subcategories: product.subcategories ?? [],
      });
      setStockGramsManual(false);
      setStockReason(null);
      setStockNote('');
    }
  }, [product]);

  // How much the stock changes with this edit, as the server will log it
  const stockChange = (() => {
    if (!product) return null;
    const wasByWeight = product.unitSize != null && product.stockGrams != null;
    if (wasByWeight && formData.trackByWeight) {
      const diff = formData.stockGrams - (product.stockGrams ?? 0);
      return Math.abs(diff) < 0.005 ? null : { diff, unit: product.unitType ?? formData.unitType };
    }
    const diff = formData.quantity - product.quantity;
    return diff === 0 ? null : { diff, unit: 'pz' };
  })();
  const effectiveReason: StockMovementReason = stockReason ?? (stockChange && stockChange.diff > 0 ? 'rifornimento' : 'rettifica');

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
      name: formData.name.trim(),
      category: formData.category.trim(),
      brand: formData.brand.trim(),
      subcategories: formData.subcategories,
      price: formData.price,
      quantity: formData.quantity,
      minThreshold: formData.minThreshold,
    };
    if (stockChange) {
      payload.stockChangeReason = effectiveReason;
      payload.stockChangeNote = stockNote.trim() || null;
    }
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

  const runDelete = async (history: boolean) => {
    if (!productId) return;
    try {
      if (history) await deleteHistory({ id: productId });
      await deleteProduct({ id: productId });
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      if (history) invalidateStock(queryClient);
      toast.show(history ? 'Prodotto e storico eliminati' : 'Prodotto eliminato');
      onClose();
    } catch (err) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      toast.show(msg ?? "Errore durante l'eliminazione", 'error');
    }
  };

  const handleDelete = () => {
    if (!productId) return;
    // Only an admin can delete the history: everyone else gets the usual question
    if (isAdmin) { setConfirmingDelete(true); return; }
    if (window.confirm('Sei sicuro di voler eliminare questo prodotto?')) void runDelete(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifica Prodotto">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {productId && (
          <button
            type="button"
            onClick={() => { onClose(); navigate(`/vendite?prodotto=${productId}`); }}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-icon-color)' }}
          >
            <BarChart3 className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-sm font-medium">Vedi vendite, utilizzi e movimenti</span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        )}
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Nome Prodotto</label>
          <input required type="text" value={formData.name}
            onChange={e => setFormData(pr => ({ ...pr, name: e.target.value }))}
            className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Marca</label>
            <BrandInput
              required
              value={formData.brand}
              onChange={val => setFormData(pr => ({ ...pr, brand: val }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Categoria</label>
            <CategoryInput
              required
              value={formData.category}
              onChange={val => setFormData(pr => ({
                ...pr,
                category: val,
                subcategories: val.trim().toLowerCase() === pr.category.trim().toLowerCase() ? pr.subcategories : [],
              }))}
            />
          </div>
        </div>
        <NewBrandColorField brand={formData.brand} color={newBrandColor} onChange={setNewBrandColor} />
        <SubcategoryInput
          brand={formData.brand}
          category={formData.category}
          value={formData.subcategories}
          onChange={subs => setFormData(pr => ({ ...pr, subcategories: subs }))}
        />
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

        {stockChange && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col gap-3">
            <p className="text-sm text-amber-900">
              Giacenza {stockChange.diff > 0 ? 'aumentata' : 'diminuita'} di{' '}
              <strong>{formatNumber(Math.abs(stockChange.diff))} {stockChange.unit}</strong>: verrà registrata nei movimenti.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Motivo</label>
                <select value={effectiveReason}
                  onChange={e => setStockReason(e.target.value as StockMovementReason)}
                  className={SELECT}>
                  {MANUAL_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={LABEL}>Nota <span className="font-normal text-stone-400">(facoltativa)</span></label>
                <input type="text" value={stockNote} onChange={e => setStockNote(e.target.value)}
                  placeholder="es. ordine n. 45" className={INPUT} />
              </div>
            </div>
          </div>
        )}

        {confirmingDelete ? (
          <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-4 flex flex-col gap-3">
            <p className="text-sm font-medium text-stone-900">
              Eliminare <span className="uppercase">{formData.name || 'questo prodotto'}</span>?
            </p>
            {loadingHistory ? (
              <p className="text-sm text-stone-500">Controllo lo storico…</p>
            ) : deletable.length > 0 ? (
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={withHistory} onChange={e => setWithHistory(e.target.checked)}
                  className="mt-0.5 w-5 h-5 shrink-0 accent-red-600" />
                <span className="text-sm text-stone-700">
                  Elimina anche lo storico dei movimenti ({deletable.length} {deletable.length === 1 ? 'movimento' : 'movimenti'})
                  <span className="block text-xs text-stone-500 mt-0.5">
                    Utile per un prodotto creato per prova o per errore.
                    {deletableSales > 0 && ` ${deletableSales === 1 ? 'La vendita al banco sparirà' : `Le ${deletableSales} vendite al banco spariranno`} anche dagli incassi.`}
                    {keptForAppointments > 0 && ' I movimenti degli appuntamenti restano.'}
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-sm text-stone-500">Il prodotto non ha movimenti da eliminare.</p>
            )}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setConfirmingDelete(false); setWithHistory(false); }} disabled={isDeleting}
                className="flex-1 bg-white border border-stone-200 text-stone-700 font-medium py-3 rounded-xl hover:bg-stone-50 transition-colors disabled:opacity-60">
                Annulla
              </button>
              <button type="button" onClick={() => void runDelete(withHistory)} disabled={isDeleting || loadingHistory}
                className="flex-1 bg-red-600 text-white font-medium py-3 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60">
                {isDeleting ? 'Eliminazione…' : 'Elimina prodotto'}
              </button>
            </div>
          </div>
        ) : (
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
        )}
      </form>
    </Modal>
  );
};
