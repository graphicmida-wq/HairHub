import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useListAppointments, useListClients, useListServices, useUpdateAppointment, useDeleteAppointment, getListAppointmentsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from './Toast';

export const EditAppointmentModal = ({ isOpen, onClose, appointmentId }: { isOpen: boolean, onClose: () => void, appointmentId: string | null }) => {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useListClients();
  const { data: services = [] } = useListServices();
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

  const [formData, setFormData] = useState<{ clientId: string; serviceId: string; date: string; time: string; durationMins: number; status: import('@workspace/api-client-react').AppointmentStatus }>({ clientId: '', serviceId: '', date: '', time: '', durationMins: 30, status: 'prenotato' as import('@workspace/api-client-react').AppointmentStatus });

  useEffect(() => {
    if (appointment) {
      setFormData({
        clientId: appointment.clientId, serviceId: appointment.serviceId,
        date: appointment.date, time: appointment.time,
        durationMins: appointment.durationMins, status: appointment.status,
      });
    }
  }, [appointment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentId) return;
    updateAppointment({ id: appointmentId, data: formData });
  };

  const handleDelete = () => {
    if (!appointmentId || !window.confirm('Sei sicuro di voler eliminare questo appuntamento?')) return;
    deleteAppointment({ id: appointmentId });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifica Appuntamento">
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
          <select value={formData.status} onChange={e => setFormData(p => ({...p, status: e.target.value as import('@workspace/api-client-react').AppointmentStatus}))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full">
            <option value="prenotato">Prenotato</option>
            <option value="confermato">Confermato</option>
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
            className="flex-[2] text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60" style={{ backgroundColor: 'var(--color-brand-dark)' }}>
            {isUpdating ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
