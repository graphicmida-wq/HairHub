import React, { useState } from 'react';
import { store } from '../lib/store';
import { useListClients } from '@workspace/api-client-react';
import { Search, UserPlus, Phone, SearchX, Loader2, AlertCircle } from 'lucide-react';
import { ClientDetailsModal } from '../components/ClientDetailsModal';
import { EditClientModal } from '../components/EditClientModal';

export const Clients = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: clients = [], isLoading, isError } = useListClients();
  const [detailClientId, setDetailClientId] = useState<string | null>(null);
  const [editClientId, setEditClientId] = useState<string | null>(null);

  const filteredClients = clients.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="flex flex-col gap-6 page-enter h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-stone-900">Clienti</h1>
        <button onClick={() => store.openModal('isNewClientOpen')} className="hidden md:flex items-center gap-2 bg-[#3A3748] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#5C5870] transition-colors">
          <UserPlus className="w-4 h-4" /> Nuovo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Cerca cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-stone-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-brand-dark focus:ring-1 focus:ring-brand-dark transition-all shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
      ) : isError ? (
        <div className="py-12 flex flex-col items-center justify-center text-red-500 gap-2">
          <AlertCircle className="w-8 h-8 opacity-70" />
          <p className="text-sm">Errore nel caricamento dei clienti.</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-stone-400">
          <SearchX className="w-12 h-12 mb-3 opacity-50" />
          <p>Nessun cliente trovato</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredClients.map(client => (
            <div
              key={client.id}
              onClick={() => setDetailClientId(client.id)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4 active:scale-[0.98] transition-all cursor-pointer hover:border-brand-dark/30 hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-serif text-lg shrink-0">
                {client.firstName.charAt(0)}{client.lastName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-stone-900 truncate">{client.firstName} {client.lastName}</h3>
                <div className="flex items-center gap-1 text-sm text-stone-500 mt-1">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span className="truncate">{client.phone}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClientDetailsModal
        isOpen={!!detailClientId}
        onClose={() => setDetailClientId(null)}
        clientId={detailClientId}
        onEdit={(id) => { setDetailClientId(null); setEditClientId(id); }}
      />

      <EditClientModal
        isOpen={!!editClientId}
        onClose={() => setEditClientId(null)}
        clientId={editClientId}
      />
    </div>
  );
};
