import React, { useState } from 'react';
import { Modal } from './Modal';
import { store, useStore } from '../lib/store';
import { AppointmentStatus } from '../types';

export const NewAppointmentModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { clients, services } = useStore();

  const [formData, setFormData] = useState({
    clientId: '',
    serviceId: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    durationMins: 30,
    status: 'prenotato' as AppointmentStatus,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.addAppointment(formData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuovo Appuntamento">
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
          </select>
        </div>

        <button type="submit" className="mt-4 bg-stone-900 text-white font-medium py-3 rounded-xl hover:bg-stone-800 transition-colors">
          Salva Appuntamento
        </button>
      </form>
    </Modal>
  );
}
