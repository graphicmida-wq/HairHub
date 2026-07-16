import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  useListAppointments, useListClients, useListServices, useListProducts,
  useUpdateAppointment, useCreateClientFormula,
  getListAppointmentsQueryKey, getListProductsQueryKey, getListClientFormulasQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, Box, CheckCircle2, FlaskConical, ChevronDown, ChevronUp, X, Plus, Trash2 } from 'lucide-react';
import { toast } from './Toast';
import { format } from 'date-fns';

interface UsedProductRow {
  productId: string;
  quantityUsed: number;
}

interface SoldProductRow {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface FormulaProductDraft {
  productId: string;
  quantity: number;
  selected: boolean;
}

interface FormulaDraft {
  id: string;
  name: string;
  notes: string;
  serviceId: string | null;
  products: FormulaProductDraft[];
}

function makeFormulaDraft(usedProducts: UsedProductRow[], defaultServiceId: string | null): FormulaDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    notes: '',
    serviceId: defaultServiceId,
    products: usedProducts.map((up) => ({
      productId: up.productId,
      quantity: up.quantityUsed,
      selected: false,
    })),
  };
}

export const CompleteAppointmentModal = ({ isOpen, onClose, appointmentId }: { isOpen: boolean, onClose: () => void, appointmentId: string | null }) => {
  const queryClient = useQueryClient();
  const { data: appointments = [] } = useListAppointments();
  const { data: clients = [] } = useListClients();
  const { data: services = [] } = useListServices();
  const { data: products = [] } = useListProducts();
  const { mutate: updateAppointment, isPending: isCompleting } = useUpdateAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        toast.show('Appuntamento completato');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { message?: string } })?.data?.message;
        toast.show(msg ?? 'Errore durante il completamento', 'error');
      },
    },
  });

  const { mutateAsync: createFormulaAsync, isPending: isSavingFormula } = useCreateClientFormula({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientFormulasQueryKey() });
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { message?: string } })?.data?.message;
        toast.show(msg ?? 'Errore nel salvataggio formula', 'error');
      },
    },
  });

  const appointment = appointments.find(a => a.id === appointmentId);
  const client = clients.find(c => c.id === appointment?.clientId);
  const serviceIds = appointment?.serviceIds ?? [];
  const appointmentServices = serviceIds
    .map(sid => services.find(s => s.id === sid))
    .filter(Boolean) as typeof services;
  const firstServiceName = appointmentServices[0]?.name ?? '';

  const [notes, setNotes] = useState('');
  const [usedProducts, setUsedProducts] = useState<UsedProductRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [soldProducts, setSoldProducts] = useState<SoldProductRow[]>([]);
  const [soldSearchTerm, setSoldSearchTerm] = useState('');
  const [servicePrices, setServicePrices] = useState<number[]>([]);
  const [serviceListPrices, setServiceListPrices] = useState<number[]>([]);
  const [showFormulaSection, setShowFormulaSection] = useState(false);
  const [formulaDrafts, setFormulaDrafts] = useState<FormulaDraft[]>([]);

  useEffect(() => {
    if (appointment) {
      setNotes(appointment.notes || '');
      if (appointment.usedProducts && appointment.usedProducts.length > 0) {
        setUsedProducts(appointment.usedProducts.map(up => ({ productId: up.productId, quantityUsed: up.quantityUsed })));
      } else {
        setUsedProducts([]);
      }
      if (appointment.soldProducts && appointment.soldProducts.length > 0) {
        setSoldProducts(appointment.soldProducts.map(sp => ({ productId: sp.productId, quantity: sp.quantity, unitPrice: sp.unitPrice })));
      } else {
        setSoldProducts([]);
      }
      const ids = appointment.serviceIds ?? [];
      const listPrices =
        appointment.serviceListPrices ??
        ids.map((sid, i) => {
          const svc = services.find(s => s.id === sid);
          return Number(svc?.price ?? appointment.servicePrices?.[i] ?? 0);
        });
      const appliedPrices = ids.map((sid, i) => {
        const v = appointment.servicePrices?.[i];
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        const fallback = listPrices?.[i];
        if (typeof fallback === 'number' && Number.isFinite(fallback)) return fallback;
        return Number(services.find(s => s.id === sid)?.price ?? 0);
      });
      setServiceListPrices(listPrices ?? []);
      setServicePrices(appliedPrices);
    }
    setShowFormulaSection(false);
    setFormulaDrafts([]);
  }, [appointment, services]);

  const activeUsedProducts = usedProducts.filter(up => up.quantityUsed > 0);
  const activeCount = activeUsedProducts.length;
  const soldCount = soldProducts.filter(sp => sp.quantity > 0).length;

  const formulaBlocksSubmit =
    showFormulaSection &&
    formulaDrafts.some((draft) => {
      const selectedProducts = draft.products.filter((product) => product.selected && product.quantity > 0);
      return !draft.name.trim() || selectedProducts.length === 0;
    });

  const doCompleteAppointment = (activeUsed: UsedProductRow[]) => {
    if (!appointment) return;
    updateAppointment({
      id: appointment.id,
      data: {
        status: 'completato',
        notes: notes || null,
        servicePrices: serviceIds.map((sid, i) => {
          const v = servicePrices[i];
          if (typeof v === 'number' && Number.isFinite(v)) return v;
          return Number(services.find(s => s.id === sid)?.price ?? 0);
        }),
        serviceListPrices: serviceIds.map((sid, i) => {
          const v = serviceListPrices[i];
          if (typeof v === 'number' && Number.isFinite(v)) return v;
          return Number(services.find(s => s.id === sid)?.price ?? servicePrices[i] ?? 0);
        }),
        usedProducts: activeUsed.length > 0 ? activeUsed : null,
        usedProductIds: activeUsed.length > 0 ? activeUsed.map(up => up.productId) : null,
        soldProducts: soldProducts.filter(sp => sp.quantity > 0).length > 0
          ? soldProducts.filter(sp => sp.quantity > 0)
          : null,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment || !client) return;

    const activeUsed = activeUsedProducts;

    if (showFormulaSection && formulaDrafts.length > 0) {
      let hasFormulaError = false;
      for (const draft of formulaDrafts) {
        const selectedProducts = draft.products
          .filter((product) => product.selected && product.quantity > 0)
          .map((product) => ({ productId: product.productId, quantity: product.quantity }));
        if (!draft.name.trim() || selectedProducts.length === 0) continue;
        try {
          await createFormulaAsync({
            data: {
              clientId: client.id,
              name: draft.name.trim(),
              serviceId: draft.serviceId,
              products: selectedProducts,
              notes: draft.notes.trim() || null,
            },
          });
        } catch {
          hasFormulaError = true;
        }
      }
      if (hasFormulaError) {
        toast.show('Alcune formule non sono state salvate', 'error');
      } else if (formulaDrafts.length > 0) {
        toast.show(formulaDrafts.length === 1 ? 'Formula salvata' : 'Formule salvate');
      }
    }

    doCompleteAppointment(activeUsed);
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSoldProducts = products.filter(p =>
    p.name.toLowerCase().includes(soldSearchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(soldSearchTerm.toLowerCase())
  );

  const getUsedRow = (productId: string) => usedProducts.find(up => up.productId === productId);

  const setQuantity = (productId: string, qty: number) => {
    setUsedProducts(prev => {
      const existing = prev.find(up => up.productId === productId);
      if (existing) {
        if (qty <= 0) return prev.filter(up => up.productId !== productId);
        return prev.map(up => up.productId === productId ? { ...up, quantityUsed: qty } : up);
      }
      if (qty <= 0) return prev;
      return [...prev, { productId, quantityUsed: qty }];
    });
  };

  const removeProduct = (productId: string) => {
    setUsedProducts(prev => prev.filter(up => up.productId !== productId));
  };

  const getSoldRow = (productId: string) => soldProducts.find(sp => sp.productId === productId);

  const setSoldRow = (productId: string, patch: Partial<SoldProductRow>) => {
    setSoldProducts(prev => {
      const existing = prev.find(sp => sp.productId === productId);
      if (existing) {
        const next = prev.map(sp => sp.productId === productId ? { ...sp, ...patch } : sp);
        const updated = next.find(sp => sp.productId === productId)!;
        if (updated.quantity <= 0) return next.filter(sp => sp.productId !== productId);
        return next;
      }
      const base = products.find(p => p.id === productId);
      const created: SoldProductRow = {
        productId,
        quantity: Math.max(0, patch.quantity ?? 0),
        unitPrice: typeof patch.unitPrice === 'number' ? patch.unitPrice : Number(base?.price ?? 0),
      };
      if (created.quantity <= 0) return prev;
      return [...prev, created];
    });
  };

  const removeSoldProduct = (productId: string) => {
    setSoldProducts(prev => prev.filter(sp => sp.productId !== productId));
  };

  useEffect(() => {
    const nextActiveUsedProducts = usedProducts.filter(up => up.quantityUsed > 0);
    setFormulaDrafts((prev) =>
      prev.map((draft) => ({
        ...draft,
        products: nextActiveUsedProducts.map((used) => {
          const existing = draft.products.find((product) => product.productId === used.productId);
          if (!existing) {
            return {
              productId: used.productId,
              quantity: used.quantityUsed,
              selected: false,
            };
          }
          return {
            ...existing,
            quantity: existing.selected ? existing.quantity : used.quantityUsed,
          };
        }),
      })),
    );
  }, [usedProducts]);

  const addFormulaDraft = () => {
    setShowFormulaSection(true);
    setFormulaDrafts((prev) => [...prev, makeFormulaDraft(activeUsedProducts, serviceIds[0] ?? null)]);
  };

  const updateFormulaDraft = (draftId: string, patch: Partial<Omit<FormulaDraft, 'id'>>) => {
    setFormulaDrafts((prev) =>
      prev.map((draft) => (draft.id === draftId ? { ...draft, ...patch } : draft)),
    );
  };

  const toggleFormulaProduct = (draftId: string, productId: string, selected: boolean) => {
    setFormulaDrafts((prev) =>
      prev.map((draft) =>
        draft.id !== draftId
          ? draft
          : {
              ...draft,
              products: draft.products.map((product) =>
                product.productId === productId ? { ...product, selected } : product,
              ),
            },
      ),
    );
  };

  const updateFormulaProductQuantity = (draftId: string, productId: string, quantity: number) => {
    setFormulaDrafts((prev) =>
      prev.map((draft) =>
        draft.id !== draftId
          ? draft
          : {
              ...draft,
              products: draft.products.map((product) =>
                product.productId === productId ? { ...product, quantity } : product,
              ),
            },
      ),
    );
  };

  const removeFormulaDraft = (draftId: string) => {
    setFormulaDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
  };

  const servicesTotal = serviceIds.reduce((sum, sid, i) => {
    const v = servicePrices[i];
    if (typeof v === 'number' && Number.isFinite(v)) return sum + v;
    return sum + Number(services.find(s => s.id === sid)?.price ?? 0);
  }, 0);

  const soldTotal = soldProducts.reduce((sum, sp) => {
    if (sp.quantity > 0) return sum + sp.quantity * sp.unitPrice;
    return sum;
  }, 0);

  const grandTotal = servicesTotal + soldTotal;

  if (!appointment || !client) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Completa Appuntamento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex flex-col gap-2">
          <h4 className="font-serif text-lg text-stone-900">{client.firstName} {client.lastName}</h4>
          <div className="flex flex-col gap-1 text-sm text-stone-600">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(appointment.date), 'dd/MM/yyyy')} &bull; {appointment.time}</span>
            <div className="flex flex-wrap items-center gap-1">
              <Box className="w-4 h-4" />
              {appointmentServices.map(svc => (
                <span key={svc.id} className="text-xs font-medium text-stone-600 bg-white px-2 py-0.5 rounded-full border border-stone-200">
                  {svc.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-stone-700">Servizi e prezzi</label>
          <div className="flex flex-col gap-1">
            {serviceIds.map((sid, idx) => {
              const svc = services.find(s => s.id === sid);
              if (!svc) return null;
              const listPrice = Number.isFinite(serviceListPrices[idx]) ? serviceListPrices[idx] : svc.price;
              return (
                <div key={sid} className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-900 truncate">{svc.name}</div>
                    <div className="text-xs text-stone-500">Listino {listPrice}€</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="0.50"
                      value={Number.isFinite(servicePrices[idx]) ? servicePrices[idx] : listPrice}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setServicePrices((p) => {
                          const next = [...p];
                          next[idx] = Number.isFinite(val) ? val : 0;
                          return next;
                        });
                      }}
                      className="w-24 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-brand-dark text-right"
                    />
                    <span className="text-xs text-stone-400">€</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Note del servizio</label>
          <textarea
            rows={3}
            placeholder="Aggiungi eventuali note tecniche, preferenze per la prossima volta, ecc..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full resize-none"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-stone-700">Prodotti Utilizzati</label>
            {activeCount > 0 && (
              <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">{activeCount} selezionati</span>
            )}
          </div>
          <input
            type="text"
            placeholder="Cerca prodotto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 outline-none focus:border-brand-dark transition-colors text-sm"
          />
          <div className="max-h-48 overflow-y-auto border border-stone-100 rounded-xl flex flex-col bg-white">
            {filteredProducts.map(p => {
              const usedRow = getUsedRow(p.id);
              const unit = p.unitType ?? 'g';
              const hasWeight = p.unitSize != null;
              return (
                <div key={p.id} className="p-3 border-b border-stone-50 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-stone-900 uppercase">{p.name}</div>
                    <div className="text-xs text-stone-500">
                      <span className="uppercase">{p.brand}</span>
                      {hasWeight && p.stockGrams != null
                        ? ` · ${p.stockGrams % 1 === 0 ? p.stockGrams : p.stockGrams.toFixed(1)} ${unit} rimanenti`
                        : ` · ${p.quantity} pz rimanenti`}
                    </div>
                  </div>
                  {hasWeight ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="0"
                        value={usedRow ? usedRow.quantityUsed : ''}
                        onChange={e => setQuantity(p.id, parseFloat(e.target.value) || 0)}
                        className="w-20 border border-stone-200 rounded-lg px-2 py-1 text-sm text-right outline-none focus:border-brand-dark"
                      />
                      <span className="text-xs text-stone-400">{unit}</span>
                      {usedRow && usedRow.quantityUsed > 0 && (
                        <button type="button" onClick={() => removeProduct(p.id)} className="text-stone-300 hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0" title="Solo registrazione — nessuna deduzione scorta per prodotti a pezzi">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        value={usedRow ? usedRow.quantityUsed : ''}
                        onChange={e => setQuantity(p.id, parseInt(e.target.value) || 0)}
                        className="w-16 border border-stone-200 rounded-lg px-2 py-1 text-sm text-right outline-none focus:border-brand-dark opacity-60"
                      />
                      <span className="text-xs text-stone-400">pz*</span>
                      {usedRow && usedRow.quantityUsed > 0 && (
                        <button type="button" onClick={() => removeProduct(p.id)} className="text-stone-300 hover:text-red-400 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredProducts.length === 0 && <div className="p-3 text-sm text-stone-500 text-center">Nessun prodotto trovato</div>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-stone-700">Prodotti Venduti</label>
            {soldCount > 0 && (
              <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">{soldCount} selezionati</span>
            )}
          </div>
          <input
            type="text"
            placeholder="Cerca prodotto..."
            value={soldSearchTerm}
            onChange={(e) => setSoldSearchTerm(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 outline-none focus:border-brand-dark transition-colors text-sm"
          />
          <div className="max-h-48 overflow-y-auto border border-stone-100 rounded-xl flex flex-col bg-white">
            {filteredSoldProducts.map(p => {
              const soldRow = getSoldRow(p.id);
              return (
                <div key={p.id} className="p-3 border-b border-stone-50 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-stone-900 uppercase">{p.name}</div>
                    <div className="text-xs text-stone-500"><span className="uppercase">{p.brand}</span> · {p.quantity} pz rimanenti</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={soldRow ? soldRow.quantity : ''}
                      onChange={e => setSoldRow(p.id, { quantity: parseInt(e.target.value) || 0 })}
                      className="w-16 border border-stone-200 rounded-lg px-2 py-1 text-sm text-right outline-none focus:border-brand-dark"
                    />
                    <span className="text-xs text-stone-400">pz</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="0"
                      value={soldRow ? soldRow.unitPrice : (p.price ?? 0)}
                      onChange={e => setSoldRow(p.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-20 border border-stone-200 rounded-lg px-2 py-1 text-sm text-right outline-none focus:border-brand-dark"
                    />
                    <span className="text-xs text-stone-400">€</span>
                    {soldRow && soldRow.quantity > 0 && (
                      <button type="button" onClick={() => removeSoldProduct(p.id)} className="text-stone-300 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredSoldProducts.length === 0 && <div className="p-3 text-sm text-stone-500 text-center">Nessun prodotto trovato</div>}
          </div>
        </div>

        <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-600">Totale servizi</span>
            <span className="font-semibold text-stone-900">€{servicesTotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-600">Prodotti venduti</span>
            <span className="font-semibold text-stone-900">€{soldTotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-700 font-medium">Totale finale</span>
            <span className="font-semibold text-stone-900">€{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        {activeCount > 0 && (
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFormulaSection(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-stone-400" />
                Formule per {client.firstName}
              </span>
              {showFormulaSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showFormulaSection && (
              <div className="border-t border-stone-100 p-4 flex flex-col gap-3 bg-stone-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-stone-500">
                    Scegli solo tra i prodotti gia usati in questo appuntamento.
                  </p>
                  <button
                    type="button"
                    onClick={addFormulaDraft}
                    className="inline-flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Aggiungi formula
                  </button>
                </div>

                {formulaDrafts.length === 0 ? (
                  <div className="text-sm text-stone-500">Nessuna formula da salvare.</div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {formulaDrafts.map((draft, index) => {
                      const selectedProducts = draft.products.filter((product) => product.selected && product.quantity > 0);
                      return (
                        <div key={draft.id} className="border border-stone-200 rounded-xl p-3 bg-white flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-stone-900">Formula {index + 1}</p>
                            <button
                              type="button"
                              onClick={() => removeFormulaDraft(draft.id)}
                              className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-stone-600">Nome formula</label>
                            <input
                              type="text"
                              placeholder={firstServiceName ? `es. Colore ${firstServiceName}` : 'es. Colore'}
                              value={draft.name}
                              onChange={(e) => updateFormulaDraft(draft.id, { name: e.target.value })}
                              className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-dark"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-stone-600">Servizio associato (opzionale)</label>
                            <select
                              value={draft.serviceId ?? ''}
                              onChange={(e) => updateFormulaDraft(draft.id, { serviceId: e.target.value || null })}
                              className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-dark"
                            >
                              <option value="">— nessun servizio —</option>
                              {appointmentServices.map((service) => (
                                <option key={service.id} value={service.id}>{service.name}</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-medium text-stone-600">Prodotti della formula</label>
                            <div className="flex flex-col gap-2">
                              {draft.products.map((product) => {
                                const productInfo = products.find((p) => p.id === product.productId);
                                const unit = productInfo?.unitType ?? 'g';
                                return (
                                  <label key={product.productId} className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={product.selected}
                                      onChange={(e) => toggleFormulaProduct(draft.id, product.productId, e.target.checked)}
                                      className="w-4 h-4 rounded border-stone-300 accent-stone-800"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm text-stone-800 truncate">{productInfo?.name ?? 'Prodotto'}</div>
                                      <div className="text-xs text-stone-500">Usato: {product.quantity}{unit}</div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={product.quantity}
                                        disabled={!product.selected}
                                        onChange={(e) => updateFormulaProductQuantity(draft.id, product.productId, parseFloat(e.target.value) || 0)}
                                        className="w-20 bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm text-right outline-none focus:border-brand-dark disabled:opacity-50"
                                      />
                                      <span className="text-xs text-stone-400">{unit}</span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                            <p className="text-xs text-stone-400">
                              Selezionati {selectedProducts.length} {selectedProducts.length === 1 ? 'prodotto' : 'prodotti'} per questa formula.
                            </p>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-stone-600">Note formula (opzionale)</label>
                            <input
                              type="text"
                              placeholder="es. Lasciare in posa 30 min"
                              value={draft.notes}
                              onChange={(e) => updateFormulaDraft(draft.id, { notes: e.target.value })}
                              className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-dark"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {formulaBlocksSubmit && (
          <p className="text-xs text-amber-600 text-center -mt-2">
            Completa nome e almeno un prodotto selezionato per ogni formula, oppure rimuovi quelle non finite.
          </p>
        )}

        <button
          type="submit"
          disabled={isCompleting || isSavingFormula || formulaBlocksSubmit}
          className="mt-2 bg-green-600 text-white font-medium py-3 rounded-xl hover:bg-green-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <CheckCircle2 className="w-5 h-5" />
          {isCompleting || isSavingFormula ? 'Salvataggio...' : 'Conferma Completamento'}
        </button>
      </form>
    </Modal>
  );
};
