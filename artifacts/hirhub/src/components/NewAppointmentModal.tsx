import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  useCreateAppointment, useListClients, useListServices, useListStaff,
  getListAppointmentsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AppointmentStatus } from '@workspace/api-client-react';
import { toast } from './Toast';
import { addMinsToTime, timeDiffMins } from '../lib/utils';

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
  const { data: clients = [] } = useListClients();
  const { data: services = [] } = useListServices();
  const { data: staff = [] } = useListStaff();

  const { mutate: createAppointment, isPending } = useCreateAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast.show('Appuntamento aggiunto');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? 'Errore durante il salvataggio', 'error');
      },
    },
  });

  const makeDefault = () => ({
    clientId: '',
    serviceId: '',
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
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultDate, defaultTime]);

  const handleStartTimeChange = (val: string) => {
    setFormData(p => ({ ...p, time: val }));
    setEndTime(addMinsToTime(val, formData.durationMins));
  };

  const handleEndTimeChange = (val: string) => {
    setEndTime(val);
    const diff = timeDiffMins(formData.time, val);
    if (diff >= 5) {
      setFormData(p => ({ ...p, durationMins: diff }));
    }
  };

  const handleServiceChange = (serviceId: string) => {
    const svc = services.find(s => s.id === serviceId);
    const newDuration = svc ? svc.durationMins : formData.durationMins;
    setFormData(p => ({ ...p, serviceId, durationMins: newDuration }));
    setEndTime(addMinsToTime(formData.time, newDuration));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const duration = timeDiffMins(formData.time, endTime);
    createAppointment({ data: { ...formData, durationMins: duration >= 5 ? duration : formData.durationMins } });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuovo Appuntamento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Cliente</label>
          <select required value={formData.clientId} onChange={e => setFormData(p => ({...p, clientId: e.target.value}))} className={INPUT}>
            <option value="" disabled>Seleziona cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Servizio</label>
          <select required value={formData.serviceId} onChange={e => handleServiceChange(e.target.value)} className={INPUT}>
            <option value="" disabled>Seleziona servizio</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMins} min - {s.price}€)</option>)}
          </select>
        </div>
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
