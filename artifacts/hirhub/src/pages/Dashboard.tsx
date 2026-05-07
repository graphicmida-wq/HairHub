import React from 'react';
import { store } from '../lib/store';
import { useStats } from '../lib/useStats';
import {
  Clock, AlertCircle, Plus, Users, ArrowRight,
  Loader2, Package2, Euro, TrendingUp, TrendingDown,
  UserPlus, Scissors, CalendarDays,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '../lib/utils';

const StatCard = ({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  badge,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  badge?: React.ReactNode;
}) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-between items-start h-32">
    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', iconBg, iconColor)}>
      {icon}
    </div>
    <div className="w-full">
      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-light text-stone-900 leading-none">{value}</p>
        {badge}
      </div>
      <p className="text-sm text-stone-500 font-medium mt-1">{label}</p>
    </div>
  </div>
);

export const Dashboard = () => {
  const {
    isLoading, isError,
    clients, services,
    fatturato, thisMonthCount, monthGrowthPct,
    noShowRate, newClientsThisMonth,
    topServices, maxServiceCount,
    upcomingByDay,
    lowStockProducts,
  } = useStats();

  const growthBadge = monthGrowthPct !== null ? (
    <span className={cn(
      'text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5 mb-0.5',
      monthGrowthPct > 0
        ? 'bg-green-100 text-green-700'
        : monthGrowthPct < 0
        ? 'bg-red-100 text-red-600'
        : 'bg-stone-100 text-stone-500'
    )}>
      {monthGrowthPct > 0
        ? <TrendingUp className="w-3 h-3" />
        : monthGrowthPct < 0
        ? <TrendingDown className="w-3 h-3" />
        : null}
      {monthGrowthPct > 0 ? '+' : ''}{monthGrowthPct}%
    </span>
  ) : null;

  return (
    <div className="flex flex-col gap-8 page-enter">

      <section>
        <span className="text-stone-500 text-sm font-medium tracking-wide uppercase">Bentornato</span>
        <h1 className="text-3xl font-serif text-stone-900 mt-1 mb-6">Panoramica del Mese</h1>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 border border-red-200 rounded-2xl p-4">
            <AlertCircle className="w-4 h-4 shrink-0" />Errore nel caricamento dei dati.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Euro className="w-5 h-5" />}
              iconBg="bg-brand-light"
              iconColor="text-brand-dark"
              value={`€${fatturato.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              label="Fatturato stimato del mese"
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              iconBg="bg-stone-100"
              iconColor="text-stone-600"
              value={String(thisMonthCount)}
              label="Appuntamenti del mese"
              badge={growthBadge}
            />
            <StatCard
              icon={<CalendarDays className="w-5 h-5" />}
              iconBg={noShowRate > 10 ? 'bg-red-100' : 'bg-stone-100'}
              iconColor={noShowRate > 10 ? 'text-red-600' : 'text-stone-600'}
              value={`${noShowRate}%`}
              label="Tasso no-show"
            />
            <StatCard
              icon={<UserPlus className="w-5 h-5" />}
              iconBg="bg-stone-100"
              iconColor="text-stone-600"
              value={String(newClientsThisMonth)}
              label="Nuovi clienti"
            />
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-stone-900 mb-4">Azioni Rapide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Prossimi appuntamenti */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-stone-900">Prossimi Appuntamenti</h2>
            <Link to="/agenda" className="text-sm text-brand-dark font-medium flex items-center gap-1 active:opacity-70">
              Vedi tutti <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
            {isLoading ? (
              <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-stone-400" /></div>
            ) : upcomingByDay.length === 0 ? (
              <div className="p-6 text-center text-stone-500 text-sm">Nessun appuntamento nei prossimi giorni.</div>
            ) : (
              upcomingByDay.map(({ dateStr, appts }) => {
                const dateLabel = format(new Date(dateStr + 'T12:00:00'), 'EEEE d MMM', { locale: it });
                return (
                  <div key={dateStr}>
                    <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
                      <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 capitalize">{dateLabel}</p>
                    </div>
                    <div className="divide-y divide-stone-100">
                      {appts.map(app => {
                        const client = clients.find(c => c.id === app.clientId);
                        const service = services.find(s => s.id === app.serviceId);
                        return (
                          <div key={app.id} className="px-4 py-3 flex items-center gap-4">
                            <span className="text-xs font-mono font-medium text-stone-500 w-10 shrink-0">{app.time}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-stone-900 text-sm truncate">{client?.firstName} {client?.lastName}</p>
                              <p className="text-xs text-stone-500 truncate">{service?.name}</p>
                            </div>
                            <div className={cn(
                              'w-2 h-2 rounded-full shrink-0',
                              app.status === 'completato' ? 'bg-green-500' :
                              app.status === 'confermato' || app.status === 'prenotato' ? 'bg-blue-400' :
                              'bg-stone-300'
                            )} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right column: top services + low stock */}
        <div className="flex flex-col gap-6">

          {/* Top servizi del mese */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-stone-900">Servizi più richiesti</h2>
              <Link to="/servizi" className="text-sm text-brand-dark font-medium flex items-center gap-1 active:opacity-70">
                Vedi tutti <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
              {isLoading ? (
                <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-stone-400" /></div>
              ) : topServices.length === 0 ? (
                <div className="p-6 text-center text-stone-500 text-sm">Nessun servizio prenotato questo mese.</div>
              ) : (
                <div className="divide-y divide-stone-100">
                  {topServices.map(({ service, count }) => (
                    <div key={service!.id} className="p-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
                        <Scissors className="w-4 h-4 text-brand-dark" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-sm font-medium text-stone-900 truncate">{service!.name}</p>
                          <span className="text-xs font-semibold text-stone-500 shrink-0">{count}x</span>
                        </div>
                        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-stone-800 rounded-full transition-all"
                            style={{ width: `${Math.round((count / maxServiceCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Low stock alert */}
          {lowStockProducts.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-stone-900">Attenzione Magazzino</h2>
                <Link to="/magazzino" className="text-sm text-brand-dark font-medium flex items-center gap-1 active:opacity-70">
                  Vedi tutti <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden divide-y divide-stone-100">
                {lowStockProducts.slice(0, 4).map(p => (
                  <div key={p.id} className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                      <Package2 className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-900 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-stone-500">{p.brand}</p>
                    </div>
                    <span className="text-sm font-medium text-red-600 shrink-0">{p.quantity} pz</span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>

    </div>
  );
};
