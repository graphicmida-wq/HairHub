import React, { useState } from 'react';
import { Modal } from './Modal';
import { useCreateClient, getListClientsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from './Toast';

export const NewClientModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const queryClient = useQueryClient();
  const { mutate: createClient, isPending } = useCreateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast.show('Cliente aggiunto con successo');
        onClose();
        setFormData({ firstName: '', lastName: '', phone: '', email: '', dob: '', notes: '', allergies: '' });
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? 'Errore durante il salvataggio', 'error');
      },
    },
  });

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', phone: '', email: '', dob: '', notes: '', allergies: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createClient({ data: {
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone,
      email: formData.email,
      dob: formData.dob || null,
      notes: formData.notes || null,
      allergies: formData.allergies || null,
    }});
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuovo Cliente">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Nome</label>
            <input required type="text" value={formData.firstName} onChange={e => setFormData(p => ({...p, firstName: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Cognome</label>
            <input required type="text" value={formData.lastName} onChange={e => setFormData(p => ({...p, lastName: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Telefono</label>
          <input required type="tel" value={formData.phone} onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Data di Nascita</label>
            <input type="date" value={formData.dob} onChange={e => setFormData(p => ({...p, dob: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-stone-700">Email</label>
            <input type="email" value={formData.email} onChange={e => setFormData(p => ({...p, email: e.target.value}))}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Allergie / Intolleranze</label>
          <input type="text" placeholder="Es. Nessuna, Nickel, Ammoniaca..." value={formData.allergies}
            onChange={e => setFormData(p => ({...p, allergies: e.target.value}))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Note</label>
          <textarea rows={2} value={formData.notes} onChange={e => setFormData(p => ({...p, notes: e.target.value}))}
            className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full resize-none" />
        </div>
        <button type="submit" disabled={isPending} className="mt-4 bg-stone-900 text-white font-medium py-3 rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-60">
          {isPending ? 'Salvataggio...' : 'Salva Cliente'}
        </button>
      </form>
    </Modal>
  );
};
