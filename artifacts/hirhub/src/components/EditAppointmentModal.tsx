import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { store, useStore } from '../lib/store';
import { AppointmentStatus } from '../types';

export const EditAppointmentModal = ({ isOpen, onClose, appointmentId }: { isOpen: boolean, onClose: () => void, appointmentId: string | null }) => {
  const { clients, services, appointments } = useStore();

  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    date: '',
    time: '',
    durationMins: 30,
    status: 'prenotato' as AppointmentStatus,
  });

  useEffect(() => {
    if (appointmentId) {
      const a = appointments.find(ap => ap.id === appointmentId);
      if (a) {
        setFormData({
          clientId: a.clientId,
          serviceId: a.serviceId,
          date: a.date,
          time: a.time,
          durationMins: a.durationMins,
          status: a.status,
        });
      }
    }
  }, [appointmentId, appointments]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (appointmentId) {
      store.updateAppointment(appointmentId, formData);
      onClose();
    }
  };

  const handleDelete = () => {
    if (appointmentId && window.confirm('Sei sicuro di voler eliminare questo appuntamento?')) {
      store.deleteAppointment(appointmentId);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifica Appuntamento">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Cliente</label>
          <select
            required
            value={formData.clientId}
            onChange={e => setFormData(p => ({...p, clientId: e.target.value}))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
          >
            <option value="" disabled>Seleziona cliente</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Servizio</label>
          <select
            required
            value={formData.serviceId}
            onChange={e => {
              const service = services.find(s => s.id === e.target.value);
              setFormData(p => ({...p, serviceId: e.target.value, durationMins: service ? service.durationMins : p.durationMins}));
            }}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
          >
            <option value="" disabled>Seleziona servizio</option>
            {services.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.durationMins} min - {s.price}€)</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Data</label>
            <input
              required
              type="date"
              value={formData.date}
              onChange={e => setFormData(p => ({...p, date: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Ora</label>
            <input
              required
              type="time"
              value={formData.time}
              onChange={e => setFormData(p => ({...p, time: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Stato</label>
          <select
            required
            value={formData.status}
            onChange={e => setFormData(p => ({...p, status: e.target.value as AppointmentStatus}))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
          >
            <option value="prenotato">Prenotato</option>
            <option value="confermato">Confermato</option>
            <option value="completato">Completato</option>
            <option value="annullato">Annullato</option>
            <option value="no-show">No Show</option>
          </select>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={handleDelete}
            className="flex-1 bg-red-50 text-red-600 font-medium py-3 rounded-xl hover:bg-red-100 transition-colors"
          >
            Elimina
          </button>
          <button type="submit" className="flex-[2] bg-stone-900 text-white font-medium py-3 rounded-xl hover:bg-stone-800 transition-colors">
            Salva Modifiche
          </button>
        </div>
      </form>
    </Modal>
  );
}
