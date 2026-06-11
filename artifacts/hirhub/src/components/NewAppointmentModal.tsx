import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  useCreateAppointment, useListServices, useListStaff,
  getListAppointmentsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AppointmentStatus } from '@workspace/api-client-react';
import { toast } from './Toast';
import { addMinsToTime, timeDiffMins } from '../lib/utils';
import { X } from 'lucide-react';
import type { Client } from '@workspace/api-client-react';
import { ClientPicker } from './ClientPicker';
import { QuickClientCreate } from './QuickClientCreate';
import { ClientInfoPanel } from './ClientInfoPanel';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultTime?: string;
}

const INPUT = "bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full";
const LABEL = "text-sm font-medium text-stone-700";

export const NewAppointmentModal = ({ isOpen, onClose, defaultDate, defaultTime }: Props) => {
  const queryClient = useQueryClient();
  const { data: services = [] } = useListServices();
  const { data: staff = [] } = useListStaff();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [isClientInfoOpen, setIsClientInfoOpen] = useState(false);

  const { mutate: createAppointment, isPending } = useCreateAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast.show('Appuntamento aggiunto');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { message?: string } })?.data?.message;
        toast.show(msg ?? 'Errore durante il salvataggio', 'error');
      },
    },
  });

  const makeDefault = () => ({
    clientId: '',
    serviceIds: [] as string[],
    servicePrices: [] as number[],
    serviceListPrices: [] as number[],
    staffId: null as string | null,
    date: defaultDate ?? new Date().toISOString().split('T')[0],
    time: defaultTime ?? '10:00',
    durationMins: 30,
    status: AppointmentStatus.prenotato as typeof AppointmentStatus[keyof typeof AppointmentStatus],
  });

  const [formData, setFormData] = useState(makeDefault);
  const [endTime, setEndTime] = useState(() => addMinsToTime(defaultTime ?? '10:00', 30));

  useEffect(() => {
    if (isOpen) {
      const d = makeDefault();
      setFormData(d);
      setEndTime(addMinsToTime(d.time, d.durationMins));
      setSelectedClient(null);
      setIsQuickClientOpen(false);
      setIsClientInfoOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultDate, defaultTime]);

  const calcDuration = (ids: string[]) =>
    ids.reduce((sum, id) => sum + (services.find(s => s.id === id)?.durationMins ?? 0), 0) || 30;

  const handleStartTimeChange = (val: string) => {
    setFormData(p => ({ ...p, time: val }));
    setEndTime(addMinsToTime(val, formData.durationMins));
  };

  const handleEndTimeChange = (val: string) => {
    setEndTime(val);
    const diff = timeDiffMins(formData.time, val);
    if (diff >= 5) setFormData(p => ({ ...p, durationMins: diff }));
  };

  const handleAddService = (serviceId: string) => {
    if (!serviceId || formData.serviceIds.includes(serviceId)) return;
    const svc = services.find(s => s.id === serviceId);
    const newIds = [...formData.serviceIds, serviceId];
    const newPrices = [...formData.servicePrices, Number(svc?.price ?? 0)];
    const newListPrices = [...formData.serviceListPrices, Number(svc?.price ?? 0)];
    const dur = calcDuration(newIds);
    setFormData(p => ({ ...p, serviceIds: newIds, servicePrices: newPrices, serviceListPrices: newListPrices, durationMins: dur }));
    setEndTime(addMinsToTime(formData.time, dur));
  };

  const handleRemoveService = (serviceId: string) => {
    const idx = formData.serviceIds.findIndex(id => id === serviceId);
    const newIds = formData.serviceIds.filter(id => id !== serviceId);
    const newPrices = idx >= 0 ? formData.servicePrices.filter((_, i) => i !== idx) : formData.servicePrices;
    const newListPrices = idx >= 0 ? formData.serviceListPrices.filter((_, i) => i !== idx) : formData.serviceListPrices;
    const dur = calcDuration(newIds);
    setFormData(p => ({ ...p, serviceIds: newIds, servicePrices: newPrices, serviceListPrices: newListPrices, durationMins: dur }));
    setEndTime(addMinsToTime(formData.time, dur));
  };

  const availableToAdd = services.filter(s => !formData.serviceIds.includes(s.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientId) {
      toast.show('Seleziona un cliente', 'error');
      return;
    }
    if (formData.serviceIds.length === 0) {
      toast.show('Seleziona almeno un servizio', 'error');
      return;
    }
    const servicePrices = formData.serviceIds.map((sid, i) => {
      const v = formData.servicePrices[i];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      return Number(services.find(s => s.id === sid)?.price ?? 0);
    });
    const serviceListPrices = formData.serviceIds.map((sid, i) => {
      const v = formData.serviceListPrices[i];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      return Number(services.find(s => s.id === sid)?.price ?? 0);
    });
    const duration = timeDiffMins(formData.time, endTime);
    createAppointment({ data: { ...formData, servicePrices, serviceListPrices, durationMins: duration >= 5 ? duration : formData.durationMins } });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuovo Appuntamento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <label className={LABEL}>Cliente</label>
            {selectedClient ? (
              <button
                type="button"
                onClick={() => setIsClientInfoOpen(true)}
                className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
              >
                Info
              </button>
            ) : null}
          </div>
          <ClientPicker
            value={selectedClient}
            onChange={(c) => {
              setSelectedClient(c);
              setFormData((p) => ({ ...p, clientId: c.id }));
            }}
            onCreateNew={() => setIsQuickClientOpen(true)}
          />
        </div>

        <QuickClientCreate
          open={isQuickClientOpen}
          onOpenChange={setIsQuickClientOpen}
          onClientReady={(c) => {
            setSelectedClient(c);
            setFormData((p) => ({ ...p, clientId: c.id }));
          }}
        />

        <ClientInfoPanel
          open={isClientInfoOpen}
          onOpenChange={setIsClientInfoOpen}
          client={selectedClient}
        />

        <div className="flex flex-col gap-1">
          <label className={LABEL}>Servizi</label>
          {formData.serviceIds.length > 0 && (
            <div className="flex flex-col gap-1 mb-1">
              {formData.serviceIds.map((sid, idx) => {
                const svc = services.find(s => s.id === sid);
                if (!svc) return null;
                const listPrice = Number.isFinite(formData.serviceListPrices[idx])
                  ? formData.serviceListPrices[idx]
                  : svc.price;
                return (
                  <div key={sid} className="flex items-center justify-between bg-stone-100 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="min-w-0">
                        <div className="text-sm text-stone-800 truncate">
                          {svc.name} <span className="text-stone-400 text-xs">({svc.durationMins} min)</span>
                        </div>
                        <div className="text-xs text-stone-500">Listino {listPrice}€</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min="0"
                          step="0.50"
                          value={Number.isFinite(formData.servicePrices[idx]) ? formData.servicePrices[idx] : svc.price}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFormData((p) => {
                              const next = [...p.servicePrices];
                              next[idx] = Number.isFinite(val) ? val : 0;
                              return { ...p, servicePrices: next };
                            });
                          }}
                          className="w-24 bg-white border border-stone-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-brand-dark"
                        />
                        <span className="text-stone-400 text-xs">€</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => handleRemoveService(sid)} className="text-stone-400 hover:text-red-500 transition-colors ml-2 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {availableToAdd.length > 0 && (
            <select
              value=""
              onChange={e => { if (e.target.value) { handleAddService(e.target.value); e.target.value = ''; } }}
              className={INPUT}
            >
              <option value="">{formData.serviceIds.length === 0 ? 'Seleziona servizio…' : '+ Aggiungi altro servizio'}</option>
              {availableToAdd.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMins} min · {s.price}€)</option>)}
            </select>
          )}
        </div>

        {formData.serviceIds.length > 0 && (
          <div className="bg-stone-50 border border-stone-100 rounded-xl p-3 flex items-center justify-between">
            <span className="text-sm font-medium text-stone-700">Totale servizi</span>
            <span className="text-sm font-semibold text-stone-900">
              €
              {formData.serviceIds
                .reduce((sum, sid, i) => {
                  const v = formData.servicePrices[i];
                  if (typeof v === 'number' && Number.isFinite(v)) return sum + v;
                  return sum + Number(services.find(s => s.id === sid)?.price ?? 0);
                }, 0)
                .toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className={LABEL}>Data</label>
          <input required type="date" value={formData.date} onChange={e => setFormData(p => ({...p, date: e.target.value}))} className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Ora inizio</label>
            <input required type="time" value={formData.time} onChange={e => handleStartTimeChange(e.target.value)} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Ora fine</label>
            <input required type="time" value={endTime} onChange={e => handleEndTimeChange(e.target.value)} className={INPUT} />
          </div>
        </div>
        {staff.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Operatore <span className="text-stone-400 font-normal">(opzionale)</span></label>
            <select value={formData.staffId ?? ''} onChange={e => setFormData(p => ({...p, staffId: e.target.value || null}))} className={INPUT}>
              <option value="">Nessun operatore</option>
              {staff.map(m => <option key={m.id} value={m.id}>{m.name}{m.role ? ` — ${m.role}` : ''}</option>)}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Stato</label>
          <select value={formData.status} onChange={e => setFormData(p => ({...p, status: e.target.value as typeof AppointmentStatus[keyof typeof AppointmentStatus]}))} className={INPUT}>
            <option value="prenotato">Prenotato</option>
            <option value="completato">Completato</option>
            <option value="annullato">Annullato</option>
            <option value="no-show">No Show</option>
          </select>
        </div>
        <button type="submit" disabled={isPending} className="btn-brand mt-4 text-white font-medium py-3 rounded-xl disabled:opacity-60">
          {isPending ? 'Salvataggio...' : 'Salva Appuntamento'}
        </button>
      </form>
    </Modal>
  );
};
