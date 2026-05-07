import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { store, useStore } from '../lib/store';

export const EditClientModal = ({ isOpen, onClose, clientId }: { isOpen: boolean, onClose: () => void, clientId: string | null }) => {
  const { clients } = useStore();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dob: '',
    notes: '',
    allergies: '',
  });

  useEffect(() => {
    if (clientId) {
      const c = clients.find(cl => cl.id === clientId);
      if (c) {
        setFormData({
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          email: c.email || '',
          dob: c.dob || '',
          notes: c.notes || '',
          allergies: c.allergies || '',
        });
      }
    }
  }, [clientId, clients]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (clientId) {
      store.updateClient(clientId, {
        ...formData,
        dob: formData.dob || undefined,
        notes: formData.notes || undefined,
        allergies: formData.allergies || undefined,
      });
      onClose();
    }
  };

  const handleDelete = () => {
    if (clientId && window.confirm('Sei sicuro di voler eliminare questo cliente? Verranno eliminati anche i suoi appuntamenti.')) {
      store.deleteClient(clientId);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifica Cliente">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Nome</label>
            <input
              required
              type="text"
              value={formData.firstName}
              onChange={e => setFormData(p => ({...p, firstName: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Cognome</label>
            <input
              required
              type="text"
              value={formData.lastName}
              onChange={e => setFormData(p => ({...p, lastName: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Telefono</label>
          <input
            required
            type="tel"
            value={formData.phone}
            onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Data di Nascita</label>
            <input
              type="date"
              value={formData.dob}
              onChange={e => setFormData(p => ({...p, dob: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData(p => ({...p, email: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Allergie / Intolleranze</label>
          <input
            type="text"
            value={formData.allergies}
            onChange={e => setFormData(p => ({...p, allergies: e.target.value}))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Note</label>
          <textarea
            rows={2}
            value={formData.notes}
            onChange={e => setFormData(p => ({...p, notes: e.target.value}))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full resize-none"
          />
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
