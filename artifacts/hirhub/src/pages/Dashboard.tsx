import React from 'react';
import { store } from '../lib/store';
import { useListAppointments, useListClients, useListProducts, useListServices } from '@workspace/api-client-react';
import { Clock, AlertCircle, Plus, Users, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { data: appointments = [], isLoading: loadingApps } = useListAppointments();
  const { data: clients = [] } = useListClients();
  const { data: products = [] } = useListProducts();
  const { data: services = [] } = useListServices();

  const today = new Date().toISOString().split('T')[0];

  const todaysAppointments = appointments
    .filter(a => a.date === today && a.status !== 'annullato')
    .sort((a, b) => a.time.localeCompare(b.time));

  const lowStockProducts = products.filter(p => p.quantity <= p.minThreshold);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

      <section>
        <span className="text-stone-500 text-sm font-medium tracking-wide uppercase">Bentornato</span>
        <h2 className="text-3xl font-serif text-stone-900 mt-1 mb-6">Panoramica di Oggi</h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-between items-start aspect-square md:aspect-auto md:h-32">
            <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center text-brand-dark mb-4 md:mb-2">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-3xl font-light text-stone-900">{todaysAppointments.length}</p>
              <p className="text-sm text-stone-500 font-medium">Appuntamenti</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-between items-start aspect-square md:aspect-auto md:h-32">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 mb-4 md:mb-2">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-3xl font-light text-stone-900">{clients.length}</p>
              <p className="text-sm text-stone-500 font-medium">Clienti totali</p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between mb-4 mt-8 md:mt-2">
        <h3 className="text-lg font-medium text-stone-900">Azioni Rapide</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
        <button onClick={() => store.openModal('isNewAppointmentOpen')} className="bg-stone-900 text-white p-4 rounded-2xl flex items-center gap-3 hover:bg-stone-800 transition-colors w-full text-left">
          <div className="bg-stone-800 p-2 rounded-xl"><Plus className="w-5 h-5 text-stone-100" /></div>
          <span className="font-medium text-sm md:text-base">Nuovo Appuntamento</span>
        </button>
        <button onClick={() => store.openModal('isNewClientOpen')} className="bg-stone-100 text-stone-900 p-4 rounded-2xl flex items-center gap-3 hover:bg-stone-200 transition-colors border border-stone-200 w-full text-left">
          <div className="bg-white p-2 rounded-xl"><Users className="w-5 h-5 text-stone-600" /></div>
          <span className="font-medium text-sm md:text-base">Nuovo Cliente</span>
        </button>
        <button onClick={() => store.openModal('isNewProductOpen')} className="bg-stone-100 text-stone-900 p-4 rounded-2xl flex items-center gap-3 hover:bg-stone-200 transition-colors border border-stone-200 w-full text-left">
          <div className="bg-white p-2 rounded-xl flex items-center justify-center shrink-0"><Plus className="w-5 h-5 text-stone-600" /></div>
          <span className="font-medium text-sm md:text-base">Nuovo Prodotto</span>
        </button>
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-stone-900">Agenda di oggi</h3>
          <Link to="/agenda" className="text-sm text-brand-dark font-medium flex items-center gap-1 active:opacity-70">
            Vedi tutti <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden divide-y divide-stone-100">
          {loadingApps ? (
            <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-stone-400" /></div>
          ) : todaysAppointments.length === 0 ? (
            <div className="p-6 text-center text-stone-500 text-sm">Nessun appuntamento previsto per oggi.</div>
          ) : (
            todaysAppointments.map(app => {
              const client = clients.find(c => c.id === app.clientId);
              const service = services.find(s => s.id === app.serviceId);

              return (
                <div key={app.id} className="p-4 flex items-center gap-4 hover:bg-stone-50 transition-colors">
                  <div className="flex flex-col items-center justify-center text-stone-900 font-medium w-12">
                    {app.time}
                  </div>
                  <div className="bg-stone-200 w-px h-10"></div>
                  <div className="flex-1 pb-1">
                    <p className="font-medium text-stone-900 text-base">{client?.firstName} {client?.lastName}</p>
                    <p className="text-sm text-stone-500">{service?.name ?? app.serviceId}</p>
                  </div>
                  {app.status === 'completato' && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                  {app.status === 'prenotato' && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                </div>
              );
            })
          )}
        </div>
      </section>

      {lowStockProducts.length > 0 && (
        <section>
          <div className="bg-red-50 text-red-900 p-5 rounded-2xl border border-red-100 flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Attenzione Magazzino</h3>
              <p className="text-sm text-red-700/80 mb-3">
                Hai {lowStockProducts.length} prodott{lowStockProducts.length > 1 ? 'i' : 'o'} sotto la soglia minima.
              </p>
              <Link to="/magazzino" className="text-sm font-semibold text-red-700 hover:text-red-800 uppercase tracking-wide">
                Controlla scorte
              </Link>
            </div>
          </div>
        </section>
      )}

    </div>
  );
};
