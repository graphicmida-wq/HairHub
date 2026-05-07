import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  useListAppointments, useListClients, useListServices, useListProducts,
  useUpdateAppointment, useCreateClientFormula,
  getListAppointmentsQueryKey, getListProductsQueryKey, getListClientFormulasQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, Box, CheckCircle2, FlaskConical, ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from './Toast';
import { format } from 'date-fns';

interface UsedProductRow {
  productId: string;
  quantityUsed: number;
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
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? 'Errore durante il completamento', 'error');
      },
    },
  });

  const { mutate: createFormula, isPending: isSavingFormula } = useCreateClientFormula({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientFormulasQueryKey() });
        toast.show('Formula salvata');
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? 'Errore nel salvataggio formula', 'error');
      },
    },
  });

  const appointment = appointments.find(a => a.id === appointmentId);
  const client = clients.find(c => c.id === appointment?.clientId);
  const service = services.find(s => s.id === appointment?.serviceId);

  const [notes, setNotes] = useState('');
  const [usedProducts, setUsedProducts] = useState<UsedProductRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormulaSection, setShowFormulaSection] = useState(false);
  const [formulaName, setFormulaName] = useState('');
  const [formulaNotes, setFormulaNotes] = useState('');
  const [formulaServiceId, setFormulaServiceId] = useState<string | null>(null);

  useEffect(() => {
    if (appointment) {
      setNotes(appointment.notes || '');
      if (appointment.usedProducts && appointment.usedProducts.length > 0) {
        setUsedProducts(appointment.usedProducts.map(up => ({ productId: up.productId, quantityUsed: up.quantityUsed })));
      } else {
        setUsedProducts([]);
      }
      setFormulaServiceId(appointment.serviceId || null);
    }
    setShowFormulaSection(false);
    setFormulaName('');
    setFormulaNotes('');
  }, [appointment]);

  if (!appointment || !client || !service) return null;

  const activeCount = usedProducts.filter(up => up.quantityUsed > 0).length;

  const formulaBlocksSubmit =
    showFormulaSection && (!formulaName.trim() || activeCount === 0);

  const doCompleteAppointment = (activeUsed: UsedProductRow[]) => {
    updateAppointment({
      id: appointment.id,
      data: {
        status: 'completato',
        notes: notes || null,
        usedProducts: activeUsed.length > 0 ? activeUsed : null,
        usedProductIds: activeUsed.length > 0 ? activeUsed.map(up => up.productId) : null,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const activeUsed = usedProducts.filter(up => up.quantityUsed > 0);
    const wantsFormula = showFormulaSection && formulaName.trim() && activeUsed.length > 0;

    if (wantsFormula) {
      // Save formula first, then complete the appointment once it succeeds (or fails gracefully)
      createFormula(
        {
          data: {
            clientId: client.id,
            name: formulaName.trim(),
            serviceId: formulaServiceId,
            products: activeUsed.map(up => ({ productId: up.productId, quantity: up.quantityUsed })),
            notes: formulaNotes.trim() || null,
          },
        },
        {
          onSuccess: () => doCompleteAppointment(activeUsed),
          onError: () => doCompleteAppointment(activeUsed),
        }
      );
    } else {
      doCompleteAppointment(activeUsed);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Completa Appuntamento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        <div className="bg-stone-50 border border-stone-100 rounded-xl p-4 flex flex-col gap-2">
          <h4 className="font-serif text-lg text-stone-900">{client.firstName} {client.lastName}</h4>
          <div className="flex flex-col gap-1 text-sm text-stone-600">
            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {format(new Date(appointment.date), 'dd/MM/yyyy')} &bull; {appointment.time}</span>
            <span className="flex items-center gap-1 font-medium"><Box className="w-4 h-4" /> {service.name}</span>
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
                    <div className="font-medium text-sm text-stone-900 truncate">{p.name}</div>
                    <div className="text-xs text-stone-500">
                      {p.brand}
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

        {activeCount > 0 && (
          <div className="border border-stone-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFormulaSection(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-stone-400" />
                Salva come formula per {client.firstName}
              </span>
              {showFormulaSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showFormulaSection && (
              <div className="border-t border-stone-100 p-4 flex flex-col gap-3 bg-stone-50">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-600">Nome formula</label>
                  <input
                    type="text"
                    placeholder={`es. Colore ${service.name}`}
                    value={formulaName}
                    onChange={e => setFormulaName(e.target.value)}
                    className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-dark"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-600">Servizio associato (opzionale)</label>
                  <select
                    value={formulaServiceId ?? ''}
                    onChange={e => setFormulaServiceId(e.target.value || null)}
                    className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-dark"
                  >
                    <option value="">— nessun servizio —</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-stone-600">Note formula (opzionale)</label>
                  <input
                    type="text"
                    placeholder="es. Lasciare in posa 30 min"
                    value={formulaNotes}
                    onChange={e => setFormulaNotes(e.target.value)}
                    className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-brand-dark"
                  />
                </div>
                <p className="text-xs text-stone-400">
                  La formula verrà salvata con {activeCount} {activeCount === 1 ? 'prodotto' : 'prodotti'} nella scheda cliente.
                </p>
              </div>
            )}
          </div>
        )}

        {formulaBlocksSubmit && (
          <p className="text-xs text-amber-600 text-center -mt-2">
            {activeCount === 0
              ? 'Seleziona almeno un prodotto per salvare la formula.'
              : 'Inserisci un nome per salvare la formula.'}
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
