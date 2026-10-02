import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Minus, Plus, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateSale, useListProducts, type Client } from '@workspace/api-client-react';
import { Modal } from './Modal';
import { ClientPicker } from './ClientPicker';
import { toast } from './Toast';
import { formatEuro, invalidateStock } from '../lib/stock';
import { BrandDot } from '../lib/product-brand-colors';

const LABEL = "text-sm font-medium text-stone-700";
const INPUT = "bg-white border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full text-sm";

interface CartLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export const NewSaleModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const { data: products = [] } = useListProducts();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [client, setClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [note, setNote] = useState('');

  // Every opening starts a fresh sale stamped with the current time
  useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    setDate(format(now, 'yyyy-MM-dd'));
    setTime(format(now, 'HH:mm'));
    setClient(null);
    setSearchTerm('');
    setCart([]);
    setNote('');
  }, [isOpen]);

  const { mutate: createSale, isPending } = useCreateSale({
    mutation: {
      onSuccess: () => {
        invalidateStock(queryClient);
        toast.show('Vendita registrata');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { message?: string } })?.data?.message;
        toast.show(msg ?? 'Errore durante la registrazione', 'error');
      },
    },
  });

  const query = searchTerm.trim().toLowerCase();
  const results = products.filter(p =>
    p.name.toLowerCase().includes(query) || p.brand.toLowerCase().includes(query)
  );

  const addProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setCart(prev => {
      const existing = prev.find(l => l.productId === productId);
      if (existing) {
        return prev.map(l => l.productId === productId ? { ...l, quantity: l.quantity + 1 } : l);
      }
      return [...prev, { productId, quantity: 1, unitPrice: product?.price ?? 0 }];
    });
  };

  const updateLine = (productId: string, patch: Partial<CartLine>) => {
    setCart(prev => prev.map(l => l.productId === productId ? { ...l, ...patch } : l));
  };

  const removeLine = (productId: string) => {
    setCart(prev => prev.filter(l => l.productId !== productId));
  };

  const total = cart.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    createSale({
      data: {
        date,
        time,
        clientId: client?.id ?? null,
        note: note.trim() || null,
        items: cart.map(l => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice })),
      },
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuova vendita">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Data</label>
            <input required type="date" value={date} onChange={e => setDate(e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Ora</label>
            <input required type="time" value={time} onChange={e => setTime(e.target.value)} className={INPUT} />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className={LABEL}>Cliente <span className="font-normal text-stone-400">(facoltativo)</span></label>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <ClientPicker value={client} onChange={setClient} />
            </div>
            {client && (
              <button
                type="button"
                onClick={() => setClient(null)}
                className="p-2 text-stone-400 hover:text-stone-700 transition-colors rounded-full hover:bg-stone-100"
                aria-label="Rimuovi cliente"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className={LABEL}>Prodotti</label>
          <input
            type="text"
            placeholder="Cerca prodotto o marca..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 outline-none focus:border-brand-dark transition-colors text-sm"
          />
          <div className="max-h-44 overflow-y-auto border border-stone-100 rounded-xl flex flex-col bg-white">
            {results.map(p => {
              const inCart = cart.find(l => l.productId === p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => addProduct(p.id)}
                  className="p-3 border-b border-stone-50 flex items-center gap-3 text-left hover:bg-stone-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-stone-900 uppercase leading-tight">{p.name}</div>
                    <div className="text-xs text-stone-500">
                      <BrandDot brand={p.brand} /><span className="uppercase">{p.brand}</span> · <span className="font-semibold text-stone-700">{p.quantity} pz</span> disponibili · {formatEuro(p.price ?? 0)}
                    </div>
                  </div>
                  <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={inCart
                      ? { backgroundColor: 'var(--color-brand-solid)', color: '#fff' }
                      : { backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-icon-color)' }}>
                    {inCart ? inCart.quantity : <Plus className="w-4 h-4" />}
                  </span>
                </button>
              );
            })}
            {results.length === 0 && <div className="p-3 text-sm text-stone-500 text-center">Nessun prodotto trovato</div>}
          </div>
        </div>

        {cart.length > 0 && (
          <div className="flex flex-col border border-stone-200 rounded-xl overflow-hidden">
            {cart.map(line => {
              const p = products.find(pr => pr.id === line.productId);
              const short = p != null && line.quantity > p.quantity;
              return (
                <div key={line.productId} className="p-3 border-b border-stone-100 last:border-b-0 flex flex-col gap-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-stone-900 uppercase leading-tight">{p?.name ?? 'Prodotto'}</div>
                      <div className={short ? "text-xs text-amber-700" : "text-xs text-stone-500"}>
                        <BrandDot brand={p?.brand} /><span className="uppercase">{p?.brand}</span>
                        {short ? ` · in magazzino solo ${p.quantity} pz` : ''}
                      </div>
                    </div>
                    <button type="button" onClick={() => removeLine(line.productId)}
                      className="text-stone-300 hover:text-red-400 transition-colors p-1" aria-label="Rimuovi prodotto">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                      <button type="button"
                        onClick={() => line.quantity > 1 ? updateLine(line.productId, { quantity: line.quantity - 1 }) : removeLine(line.productId)}
                        className="w-8 h-8 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50"
                        aria-label="Diminuisci">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-stone-900">{line.quantity}</span>
                      <button type="button"
                        onClick={() => updateLine(line.productId, { quantity: line.quantity + 1 })}
                        className="w-8 h-8 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50"
                        aria-label="Aumenta">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-stone-400">€ cad.</span>
                      <input
                        type="number" min="0" step="0.5"
                        value={line.unitPrice}
                        onChange={e => updateLine(line.productId, { unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                        className="w-20 border border-stone-200 rounded-lg px-2 py-1 text-sm text-right outline-none focus:border-brand-dark"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className={LABEL}>Note <span className="font-normal text-stone-400">(facoltative)</span></label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} className={INPUT} />
        </div>

        <div className="flex items-center justify-between border-t border-stone-100 pt-3">
          <span className="text-sm text-stone-600">Totale</span>
          <span className="text-lg font-semibold text-stone-900">{formatEuro(total)}</span>
        </div>

        <button type="submit" disabled={isPending || cart.length === 0}
          className="btn-brand w-full text-white font-medium py-3 rounded-xl disabled:opacity-60">
          {isPending ? 'Registrazione...' : 'Registra vendita'}
        </button>
      </form>
    </Modal>
  );
};
