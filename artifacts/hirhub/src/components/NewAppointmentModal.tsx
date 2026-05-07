import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useCreateAppointment, useListClients, useListServices, getListAppointmentsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { AppointmentStatus } from '@workspace/api-client-react';
import { toast } from './Toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultDate?: string;
  defaultTime?: string;
}

export const NewAppointmentModal = ({ isOpen, onClose, defaultDate, defaultTime }: Props) => {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useListClients();
  const { data: services = [] } = useListServices();

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
    date: defaultDate ?? new Date().toISOString().split('T')[0],
    time: defaultTime ?? '10:00',
    durationMins: 30,
    status: AppointmentStatus.prenotato as typeof AppointmentStatus[keyof typeof AppointmentStatus],
  });

  const [formData, setFormData] = useState(makeDefault);

  useEffect(() => {
    if (isOpen) {
      setFormData(makeDefault());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultDate, defaultTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAppointment({ data: { ...formData } });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuovo Appuntamento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Cliente</label>
          <select required value={formData.clientId} onChange={e => setFormData(p => ({...p, clientId: e.target.value}))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full">
            <option value="" disabled>Seleziona cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Servizio</label>
          <select required value={formData.serviceId} onChange={e => {
              const svc = services.find(s => s.id === e.target.value);
              setFormData(p => ({...p, serviceId: e.target.value, durationMins: svc ? svc.durationMins : p.durationMins}));
            }}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full">
            <option value="" disabled>Seleziona servizio</option>
            {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMins} min - {s.price}€)</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Data</label>
            <input required type="date" value={formData.date} onChange={e => setFormData(p => ({...p, date: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Ora</label>
            <input required type="time" value={formData.time} onChange={e => setFormData(p => ({...p, time: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Stato</label>
          <select value={formData.status} onChange={e => setFormData(p => ({...p, status: e.target.value as typeof AppointmentStatus[keyof typeof AppointmentStatus]}))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full">
            <option value="prenotato">Prenotato</option>
            <option value="confermato">Confermato</option>
            <option value="completato">Completato</option>
          </select>
        </div>
        <button type="submit" disabled={isPending} className="mt-4 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60" style={{ backgroundColor: '#3A3748' }}>
          {isPending ? 'Salvataggio...' : 'Salva Appuntamento'}
        </button>
      </form>
    </Modal>
  );
};
