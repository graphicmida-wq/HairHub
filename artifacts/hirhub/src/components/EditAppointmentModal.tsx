import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  useListAppointments, useListClients, useListServices, useListStaff,
  useUpdateAppointment, useDeleteAppointment, getListAppointmentsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from './Toast';
import { addMinsToTime, timeDiffMins } from '../lib/utils';
import { X } from 'lucide-react';
import { ClientInfoPanel } from './ClientInfoPanel';

const INPUT = "bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full";
const LABEL = "text-sm font-medium text-stone-700";

export const EditAppointmentModal = ({ isOpen, onClose, appointmentId }: { isOpen: boolean, onClose: () => void, appointmentId: string | null }) => {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useListClients();
  const { data: services = [] } = useListServices();
  const { data: staff = [] } = useListStaff();
  const { data: appointments = [] } = useListAppointments();
  const appointment = appointments.find(a => a.id === appointmentId);
  const [isClientInfoOpen, setIsClientInfoOpen] = useState(false);

  const { mutate: updateAppointment, isPending: isUpdating } = useUpdateAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast.show('Appuntamento aggiornato');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { message?: string } })?.data?.message;
        toast.show(msg ?? 'Errore durante il salvataggio', 'error');
      },
    },
  });

  const { mutate: deleteAppointment, isPending: isDeleting } = useDeleteAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast.show('Appuntamento eliminato');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { message?: string } })?.data?.message;
        toast.show(msg ?? 'Errore durante l\'eliminazione', 'error');
      },
    },
  });

  const [formData, setFormData] = useState<{
    clientId: string; serviceIds: string[]; staffId: string | null;
    servicePrices: number[];
    serviceListPrices: number[];
    date: string; time: string; durationMins: number;
    status: import('@workspace/api-client-react').AppointmentStatus;
  }>({ clientId: '', serviceIds: [], servicePrices: [], serviceListPrices: [], staffId: null, date: '', time: '', durationMins: 30, status: 'prenotato' as import('@workspace/api-client-react').AppointmentStatus });

  const [endTime, setEndTime] = useState('');
  const selectedClient = clients.find(c => c.id === formData.clientId) ?? null;

  useEffect(() => {
    if (appointment) {
      const ids = appointment.serviceIds ?? [];
      const listPrices =
        appointment.serviceListPrices ??
        ids.map((sid, i) => {
          const svc = services.find(s => s.id === sid);
          return Number(svc?.price ?? appointment.servicePrices?.[i] ?? 0);
        });
      setFormData({
        clientId: appointment.clientId,
        serviceIds: ids,
        servicePrices: appointment.servicePrices ?? [],
        serviceListPrices: listPrices ?? [],
        staffId: appointment.staffId ?? null,
        date: appointment.date, time: appointment.time,
        durationMins: appointment.durationMins, status: appointment.status,
      });
      setEndTime(addMinsToTime(appointment.time, appointment.durationMins));
    }
  }, [appointment, services]);

  useEffect(() => {
    if (!isOpen) setIsClientInfoOpen(false);
  }, [isOpen]);

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
    if (!appointmentId) return;
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
      return Number(services.find(s => s.id === sid)?.price ?? servicePrices[i] ?? 0);
    });
    const duration = timeDiffMins(formData.time, endTime);
    updateAppointment({ id: appointmentId, data: { ...formData, servicePrices, serviceListPrices, durationMins: duration >= 5 ? duration : formData.durationMins } });
  };

  const handleDelete = () => {
    if (!appointmentId || !window.confirm('Sei sicuro di voler eliminare questo appuntamento?')) return;
    deleteAppointment({ id: appointmentId });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifica Appuntamento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <label className={LABEL}>Cliente</label>
            {formData.clientId ? (
              <button
                type="button"
                onClick={() => setIsClientInfoOpen(true)}
                className="text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors"
              >
                Info
              </button>
            ) : null}
          </div>
          <select required value={formData.clientId} onChange={e => setFormData(p => ({...p, clientId: e.target.value}))} className={INPUT}>
            <option value="" disabled>Seleziona cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </select>
        </div>

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
          <select value={formData.status} onChange={e => setFormData(p => ({...p, status: e.target.value as import('@workspace/api-client-react').AppointmentStatus}))} className={INPUT}>
            <option value="prenotato">Prenotato</option>
            <option value="completato">Completato</option>
            <option value="annullato">Annullato</option>
            <option value="no-show">No Show</option>
          </select>
        </div>
        <div className="flex items-center gap-2 mt-4">
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
