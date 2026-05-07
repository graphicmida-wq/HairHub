import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { useListClients, useUpdateClient, useDeleteClient, getListClientsQueryKey, getListAppointmentsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from './Toast';

const LABEL = "text-sm font-medium text-stone-700";
const INPUT = "bg-white border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full text-sm";

export const EditClientModal = ({ isOpen, onClose, clientId }: { isOpen: boolean, onClose: () => void, clientId: string | null }) => {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useListClients();
  const client = clients.find(c => c.id === clientId);

  const { mutate: updateClient, isPending: isUpdating } = useUpdateClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        toast.show('Cliente aggiornato');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? 'Errore durante il salvataggio', 'error');
      },
    },
  });

  const { mutate: deleteClient, isPending: isDeleting } = useDeleteClient({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
        toast.show('Cliente eliminato');
        onClose();
      },
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.show(msg ?? "Errore durante l'eliminazione", 'error');
      },
    },
  });

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', phone: '', email: '', dob: '', notes: '', allergies: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        firstName: client.firstName, lastName: client.lastName,
        phone: client.phone, email: client.email ?? '',
        dob: client.dob ?? '', notes: client.notes ?? '', allergies: client.allergies ?? '',
      });
    }
  }, [client]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    updateClient({
      id: clientId,
      data: { ...formData, dob: formData.dob || null, notes: formData.notes || null, allergies: formData.allergies || null },
    });
  };

  const handleDelete = () => {
    if (!clientId || !window.confirm('Sei sicuro di voler eliminare questo cliente?')) return;
    deleteClient({ id: clientId });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modifica Cliente">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Nome</label>
            <input required type="text" value={formData.firstName}
              onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))}
              className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Cognome</label>
            <input required type="text" value={formData.lastName}
              onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
              className={INPUT} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Telefono</label>
          <input required type="tel" value={formData.phone}
            onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
            className={INPUT} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Data di Nascita</label>
            <input type="date" value={formData.dob}
              onChange={e => setFormData(p => ({ ...p, dob: e.target.value }))}
              className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={LABEL}>Email</label>
            <input type="email" value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
              className={INPUT} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Allergie / Intolleranze</label>
          <input type="text" value={formData.allergies}
            onChange={e => setFormData(p => ({ ...p, allergies: e.target.value }))}
            className={INPUT} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={LABEL}>Note</label>
          <textarea rows={2} value={formData.notes}
            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
            className={INPUT + ' resize-none'} />
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button type="button" onClick={handleDelete} disabled={isDeleting}
            className="flex-1 bg-red-50 text-red-600 font-medium py-3 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60">
            {isDeleting ? '...' : 'Elimina'}
          </button>
          <button type="submit" disabled={isUpdating}
            className="flex-[2] text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-brand-dark)' }}>
            {isUpdating ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
