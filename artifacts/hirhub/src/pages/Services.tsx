import React, { useState } from 'react';
import { useListServices } from '@workspace/api-client-react';
import { Scissors, Plus, Clock, Euro, AlertCircle, Loader2 } from 'lucide-react';
import { store } from '../lib/store';
import { EditServiceModal } from '../components/EditServiceModal';

export const Services = () => {
  const { data: services = [], isLoading, isError } = useListServices();
  const [editServiceId, setEditServiceId] = useState<string | null>(null);

  const byCategory = services.reduce<Record<string, typeof services>>((acc, s) => {
    const cat = s.category || 'Altro';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 page-enter">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-stone-900">Servizi</h1>
        <button
          onClick={() => store.openModal('isNewServiceOpen')}
          className="hidden md:flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--color-brand-dark)' }}
        >
          <Plus className="w-4 h-4" /> Nuovo Servizio
        </button>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      ) : isError ? (
        <div className="py-12 flex flex-col items-center justify-center text-red-500 gap-2">
          <AlertCircle className="w-8 h-8 opacity-70" />
          <p className="text-sm">Errore nel caricamento dei servizi.</p>
        </div>
      ) : services.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-stone-400 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center">
            <Scissors className="w-8 h-8 opacity-50" />
          </div>
          <div className="text-center">
            <p className="font-medium text-stone-600">Nessun servizio</p>
            <p className="text-sm mt-1">Aggiungi il primo servizio del tuo listino</p>
          </div>
          <button
            onClick={() => store.openModal('isNewServiceOpen')}
            className="flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors" style={{ backgroundColor: 'var(--color-brand-dark)' }}
          >
            <Plus className="w-4 h-4" /> Nuovo Servizio
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(byCategory).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3 px-1">
                {category}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(service => (
                  <div
                    key={service.id}
                    onClick={() => setEditServiceId(service.id)}
                    className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4 cursor-pointer hover:border-brand-dark/30 hover:shadow-md transition-all active:scale-[0.98]"
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--color-brand-gold-bg)', color: 'var(--color-brand-gold)' }}>
                      <Scissors className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-stone-900 truncate">{service.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-stone-500">
                          <Clock className="w-3 h-3" />
                          {service.durationMins} min
                        </span>
                        <span className="flex items-center gap-0.5 text-xs font-medium text-brand-dark">
                          <Euro className="w-3 h-3" />
                          {service.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <EditServiceModal
        isOpen={!!editServiceId}
        onClose={() => setEditServiceId(null)}
        serviceId={editServiceId}
      />
    </div>
  );
};
