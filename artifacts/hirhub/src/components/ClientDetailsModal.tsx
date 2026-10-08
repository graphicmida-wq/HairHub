import React, { useState } from 'react';
import { Modal } from './Modal';
import {
  useListClients, useListServices, useListProducts,
  useListClientFormulas, useCreateClientFormula, useUpdateClientFormula, useDeleteClientFormula,
  getListClientFormulasQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Phone, Mail, FileText, AlertTriangle, Edit, FlaskConical, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from './Toast';
import type { ClientFormulaProduct, ClientFormula } from '@workspace/api-client-react';
import { ClientStats, ClientTimeline, useClientHistory } from './ClientHistory';
import { BirthdayPromoBadge } from './BirthdayPromoBadge';
import { ageOn, formatBirthday, parseBirthday } from '../lib/birthdays';

interface FormulaFormState {
  name: string;
  serviceId: string;
  products: { productId: string; quantity: number }[];
  notes: string;
}

const emptyFormulaForm = (): FormulaFormState => ({
  name: '', serviceId: '', products: [], notes: '',
});

export const ClientDetailsModal = ({ isOpen, onClose, clientId, onEdit }: { isOpen: boolean, onClose: () => void, clientId: string | null, onEdit: (id: string) => void }) => {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useListClients();
  const history = useClientHistory(clientId);
  const { data: services = [] } = useListServices();
  const { data: products = [] } = useListProducts();
  const { data: allFormulas = [] } = useListClientFormulas(
    clientId ? { clientId } : undefined
  );

  const { mutate: createFormula } = useCreateClientFormula({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientFormulasQueryKey() });
        toast.show('Formula salvata');
        setEditingFormula(null);
        setNewFormulaForm(null);
      },
      onError: () => toast.show('Errore nel salvataggio formula', 'error'),
    },
  });

  const { mutate: updateFormula } = useUpdateClientFormula({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientFormulasQueryKey() });
        toast.show('Formula aggiornata');
        setEditingFormula(null);
      },
      onError: () => toast.show('Errore nel salvataggio formula', 'error'),
    },
  });

  const { mutate: deleteFormula } = useDeleteClientFormula({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientFormulasQueryKey() });
        toast.show('Formula eliminata');
      },
      onError: () => toast.show("Errore nell'eliminazione formula", 'error'),
    },
  });

  const [editingFormula, setEditingFormula] = useState<string | null>(null);
  const [editFormulaForm, setEditFormulaForm] = useState<FormulaFormState>(emptyFormulaForm());
  const [newFormulaForm, setNewFormulaForm] = useState<FormulaFormState | null>(null);

  const client = clients.find(c => c.id === clientId);
  if (!client) return null;
  const birthday = parseBirthday(client.dob);

  const clientFormulas = allFormulas.filter(f => f.clientId === client.id);

  const startEditFormula = (formula: ClientFormula) => {
    setEditingFormula(formula.id);
    setEditFormulaForm({
      name: formula.name,
      serviceId: formula.serviceId ?? '',
      products: formula.products.map((p: ClientFormulaProduct) => ({ productId: p.productId, quantity: p.quantity })),
      notes: formula.notes ?? '',
    });
  };

  const activeProductCount = (form: FormulaFormState) =>
    form.products.filter(p => p.quantity > 0).length;

  const handleSaveEdit = (formulaId: string) => {
    const activeProducts = editFormulaForm.products.filter(p => p.quantity > 0);
    if (!editFormulaForm.name.trim() || activeProducts.length === 0) return;
    updateFormula({
      id: formulaId,
      data: {
        name: editFormulaForm.name,
        serviceId: editFormulaForm.serviceId || null,
        products: activeProducts,
        notes: editFormulaForm.notes || null,
      },
    });
  };

  const handleCreateFormula = () => {
    if (!newFormulaForm) return;
    const activeProducts = newFormulaForm.products.filter(p => p.quantity > 0);
    if (!newFormulaForm.name.trim() || activeProducts.length === 0) return;
    createFormula({
      data: {
        clientId: client.id,
        name: newFormulaForm.name,
        serviceId: newFormulaForm.serviceId || null,
        products: activeProducts,
        notes: newFormulaForm.notes || null,
      },
    });
  };

  const handleDeleteFormula = (formulaId: string) => {
    if (!window.confirm('Eliminare questa formula?')) return;
    deleteFormula({ id: formulaId });
  };

  const updateFormulaProductQty = (
    form: FormulaFormState,
    setForm: (f: FormulaFormState) => void,
    productId: string,
    qty: number
  ) => {
    const existing = form.products.find(p => p.productId === productId);
    if (existing) {
      if (qty <= 0) {
        setForm({ ...form, products: form.products.filter(p => p.productId !== productId) });
      } else {
        setForm({ ...form, products: form.products.map(p => p.productId === productId ? { ...p, quantity: qty } : p) });
      }
    } else if (qty > 0) {
      setForm({ ...form, products: [...form.products, { productId, quantity: qty }] });
    }
  };

  const FormulaProductEditor = ({ form, setForm }: { form: FormulaFormState, setForm: (f: FormulaFormState) => void }) => (
    <div className="flex flex-col gap-2 mt-2">
      <p className="text-xs font-medium text-stone-500">Prodotti (lascia 0 per escludere)</p>
      <div className="max-h-36 overflow-y-auto flex flex-col gap-1">
        {products.map(p => {
          const entry = form.products.find(fp => fp.productId === p.id);
          const unit = p.unitType ?? 'g';
          return (
            <div key={p.id} className="flex items-center gap-2">
              <span className="flex-1 text-xs text-stone-700 truncate">{p.name}</span>
              <input
                type="number" min="0" step="0.1"
                value={entry ? entry.quantity : ''}
                placeholder="0"
                onChange={e => updateFormulaProductQty(form, setForm, p.id, parseFloat(e.target.value) || 0)}
                className="w-16 border border-stone-200 rounded px-1.5 py-1 text-xs text-right outline-none focus:border-brand-dark"
              />
              <span className="text-xs text-stone-400 w-5">{unit}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scheda Cliente" wide>
      {/* Phones: one column (history before formulas). Larger screens: history on the right. */}
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:grid-rows-[auto_1fr] md:gap-x-8 md:items-start">
        <div className="flex flex-col gap-6 md:col-start-1 md:row-start-1">
          <div className="flex items-start justify-between">
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center font-serif text-2xl shrink-0" style={{ backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-icon-color)' }}>
                {client.firstName.charAt(0)}{client.lastName.charAt(0)}
              </div>
              <div>
                <h3 className="font-serif text-2xl text-stone-900">{client.firstName} {client.lastName}</h3>
                <div className="flex items-center gap-2 text-stone-500 mt-1 flex-wrap">
                  {client.phone && <span className="flex items-center gap-1 text-sm"><Phone className="w-3.5 h-3.5" /> {client.phone}</span>}
                  {client.email && <span className="flex items-center gap-1 text-sm"><Mail className="w-3.5 h-3.5" /> {client.email}</span>}
                </div>
              </div>
            </div>
            <button onClick={() => onEdit(client.id)} className="p-2 text-stone-400 hover:text-stone-900 bg-stone-50 rounded-full transition-colors">
              <Edit className="w-4 h-4" />
            </button>
          </div>

          <BirthdayPromoBadge client={client} date={format(new Date(), 'yyyy-MM-dd')} />

          {(birthday || client.allergies || client.notes) && (
            <div className="grid grid-cols-1 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-100">
              {birthday && (
                <div>
                  <span className="text-xs uppercase font-semibold text-stone-400 tracking-wider">Compleanno</span>
                  <p className="text-sm font-medium text-stone-900 mt-0.5">
                    {formatBirthday(birthday)}
                    {birthday.year && <span className="font-normal text-stone-500"> · {ageOn(birthday, new Date())} anni</span>}
                  </p>
                </div>
              )}
              {client.allergies && (
                <div className="text-red-700 bg-red-50 p-2 -mx-2 rounded-lg">
                  <span className="text-xs uppercase font-semibold tracking-wider flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Allergie / Intolleranze</span>
                  <p className="text-sm font-medium mt-0.5">{client.allergies}</p>
                </div>
              )}
              {client.notes && (
                <div>
                  <span className="text-xs uppercase font-semibold text-stone-400 tracking-wider flex items-center gap-1"><FileText className="w-3 h-3" /> Note</span>
                  <p className="text-sm text-stone-700 mt-0.5 whitespace-pre-line">{client.notes}</p>
                </div>
              )}
            </div>
          )}

          <ClientStats history={history} />
        </div>

        <div className="md:col-start-2 md:row-start-1 md:row-span-2">
          <ClientTimeline history={history} />
        </div>

        {/* Formulas section */}
        <div className="md:col-start-1 md:row-start-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-stone-900 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-stone-400" />
              Formule
            </h4>
            <button
              onClick={() => setNewFormulaForm(emptyFormulaForm())}
              className="text-xs flex items-center gap-1 text-stone-500 hover:text-stone-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nuova Formula
            </button>
          </div>

          {newFormulaForm && (
            <div className="mb-3 border border-stone-200 rounded-xl p-3 bg-stone-50 flex flex-col gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Nome formula"
                value={newFormulaForm.name}
                onChange={e => setNewFormulaForm({ ...newFormulaForm, name: e.target.value })}
                className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-dark"
              />
              <select
                value={newFormulaForm.serviceId}
                onChange={e => setNewFormulaForm({ ...newFormulaForm, serviceId: e.target.value })}
                className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-dark"
              >
                <option value="">— Servizio (opzionale) —</option>
                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <FormulaProductEditor form={newFormulaForm} setForm={setNewFormulaForm} />
              <input
                type="text"
                placeholder="Note (opzionale)"
                value={newFormulaForm.notes}
                onChange={e => setNewFormulaForm({ ...newFormulaForm, notes: e.target.value })}
                className="bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-dark"
              />
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={handleCreateFormula}
                  disabled={!newFormulaForm.name.trim() || activeProductCount(newFormulaForm) === 0}
                  className="flex items-center gap-1 text-xs bg-stone-800 text-white px-3 py-1.5 rounded-lg disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5" /> Salva
                </button>
                <button type="button" onClick={() => setNewFormulaForm(null)} className="text-xs text-stone-500 hover:text-stone-800 px-2">
                  Annulla
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            {clientFormulas.length === 0 && !newFormulaForm && (
              <p className="text-sm text-stone-500 italic px-2">Nessuna formula salvata.</p>
            )}
            {clientFormulas.map(formula => {
              const svc = services.find(s => s.id === formula.serviceId);
              const isEditing = editingFormula === formula.id;
              return (
                <div key={formula.id} className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col gap-2">
                  {isEditing ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={editFormulaForm.name}
                        onChange={e => setEditFormulaForm({ ...editFormulaForm, name: e.target.value })}
                        className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-dark"
                      />
                      <select
                        value={editFormulaForm.serviceId}
                        onChange={e => setEditFormulaForm({ ...editFormulaForm, serviceId: e.target.value })}
                        className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-dark"
                      >
                        <option value="">— Servizio (opzionale) —</option>
                        {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <FormulaProductEditor form={editFormulaForm} setForm={setEditFormulaForm} />
                      <input
                        type="text"
                        placeholder="Note"
                        value={editFormulaForm.notes}
                        onChange={e => setEditFormulaForm({ ...editFormulaForm, notes: e.target.value })}
                        className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-dark"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleSaveEdit(formula.id)}
                          disabled={!editFormulaForm.name.trim() || activeProductCount(editFormulaForm) === 0}
                          className="flex items-center gap-1 text-xs bg-stone-800 text-white px-3 py-1.5 rounded-lg disabled:opacity-40">
                          <Check className="w-3.5 h-3.5" /> Salva
                        </button>
                        <button type="button" onClick={() => setEditingFormula(null)} className="text-xs text-stone-500 hover:text-stone-800 px-2">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-stone-900">{formula.name}</span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => startEditFormula(formula)}
                            className="p-1 text-stone-400 hover:text-stone-700 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDeleteFormula(formula.id)}
                            className="p-1 text-stone-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {svc && <span className="text-xs text-stone-500">{svc.name}</span>}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {formula.products.map((fp: ClientFormulaProduct, i: number) => {
                          const prod = products.find(p => p.id === fp.productId);
                          const unit = prod?.unitType ?? 'g';
                          return (
                            <span key={i} className="text-[0.625rem] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full border border-stone-200">
                              {prod?.name ?? 'Prodotto'} {fp.quantity}{unit}
                            </span>
                          );
                        })}
                      </div>
                      {formula.notes && (
                        <p className="text-xs text-stone-500 italic mt-1">{formula.notes}</p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </Modal>
  );
};
