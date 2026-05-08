import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import {
  useListAppointments, useListClients, useListServices, useListStaff,
  useUpdateAppointment, useDeleteAppointment, getListAppointmentsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from './Toast';
import { addMinsToTime, timeDiffMins } from '../lib/utils';

const INPUT = "bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full";
const LABEL = "text-sm font-medium text-stone-700";

export const EditAppointmentModal = ({ isOpen, onClose, appointmentId }: { isOpen: boolean, onClose: () => void, appointmentId: string | null }) => {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useListClients();
  const { data: services = [] } = useListServices();
  const { data: staff = [] } = useListStaff();
  const { data: appointments = [] } = useListAppointments();
  const appointment = appointments.find(a => a.id === appointmentId);

  const { mutate: updateAppointment, isPending: isUpdating } = useUpdateAppointment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast.show('Appuntamento aggiornato');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
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
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? 'Errore durante l\'eliminazione', 'error');
      },
    },
  });

  const [formData, setFormData] = useState<{
    clientId: string; serviceId: string; staffId: string | null;
    date: string; time: string; durationMins: number;
    status: import('@workspace/api-client-react').AppointmentStatus;
  }>({ clientId: '', serviceId: '', staffId: null, date: '', time: '', durationMins: 30, status: 'prenotato' as import('@workspace/api-client-react').AppointmentStatus });

  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (appointment) {
      setFormData({
        clientId: appointment.clientId, serviceId: appointment.serviceId,
        staffId: appointment.staffId ?? null,
        date: appointment.date, time: appointment.time,
        durationMins: appointment.durationMins, status: appointment.status,
      });
      setEndTime(addMinsToTime(appointment.time, appointment.durationMins));
    }
  }, [appointment]);

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
    if (!appointmentId) return;
    const duration = timeDiffMins(formData.time, endTime);
    updateAppointment({ id: appointmentId, data: { ...formData, durationMins: duration >= 5 ? duration : formData.durationMins } });
  };

  const handleDelete = () => {
    if (!appointmentId || !window.confirm('Sei sicuro di voler eliminare questo appuntamento?')) return;
    deleteAppointment({ id: appointmentId });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifica Appuntamento">
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
