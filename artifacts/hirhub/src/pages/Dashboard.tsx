import React from 'react';
import { store } from '../lib/store';
import { useStats } from '../lib/useStats';
import {
  AlertCircle, Plus, Users, ArrowRight,
  Loader2, Package2, TrendingUp, TrendingDown,
  UserPlus, Scissors, CalendarDays, Calendar,
  Clock, ChevronRight, MoreHorizontal,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '../lib/utils';

const CARD_BORDER = '#E8E3D8';
const CARD_SHADOW = '0 2px 12px rgba(92,88,112,0.04)';
const ACCENT = 'var(--color-brand-dark)';
const ACCENT_LIGHT = 'var(--color-brand-icon-bg)';
const TEXT_HEADING = 'var(--color-brand-dark)';
const TEXT_BODY = '#6B6880';
const TEXT_MUTED = 'var(--color-brand-muted)';

const KpiCard = ({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: React.ReactNode;
}) => (
  <div
    className="rounded-2xl p-5 flex flex-col relative overflow-hidden bg-[#ffffff91]"
    style={{ border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
  >
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center mb-4 shrink-0"
      style={{ backgroundColor: ACCENT_LIGHT }}
    >
      {icon}
    </div>
    <p className="text-[10px] uppercase tracking-[0.18em] font-medium mb-1" style={{ color: TEXT_MUTED }}>
      {label}
    </p>
    <p className="text-3xl font-semibold mb-1 leading-none" style={{ fontFamily: '"Playfair Display", serif', color: TEXT_HEADING }}>
      {value}
    </p>
    {sub && <div className="mt-1">{sub}</div>}
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
      'text-xs font-semibold flex items-center gap-0.5',
      monthGrowthPct > 0 ? 'text-emerald-600' : monthGrowthPct < 0 ? 'text-red-500' : ''
    )} style={{ color: monthGrowthPct === 0 ? TEXT_MUTED : undefined }}>
      {monthGrowthPct > 0 ? <TrendingUp className="w-3 h-3" /> : monthGrowthPct < 0 ? <TrendingDown className="w-3 h-3" /> : null}
      {monthGrowthPct > 0 ? '+' : ''}{monthGrowthPct}% rispetto al mese scorso
    </span>
  ) : null;

  return (
    <div className="flex flex-col gap-8 page-enter">

      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-medium mb-1.5" style={{ color: TEXT_MUTED }}>
            Bentornato
          </p>
          <h1 className="text-4xl" style={{ fontFamily: '"Playfair Display", serif', color: TEXT_HEADING }}>
            Panoramica del Mese
          </h1>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            to="/agenda"
            className="px-5 py-2.5 rounded-full border bg-white font-medium text-sm flex items-center gap-2 transition-colors hover:bg-stone-50"
            style={{ borderColor: CARD_BORDER, color: 'var(--color-brand-primary)', boxShadow: '0 1px 4px rgba(92,88,112,0.06)' }}
          >
            <Calendar className="w-4 h-4" />
            Vedi Agenda
          </Link>
          <button
            onClick={() => store.openModal('isNewAppointmentOpen')}
            className="btn-brand px-5 py-2.5 rounded-full text-white font-medium text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuovo Appuntamento
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: TEXT_MUTED }} />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 border border-red-100 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 shrink-0" />Errore nel caricamento dei dati.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={<TrendingUp className="w-5 h-5" style={{ color: 'var(--color-brand-icon-color)' }} />}
              label="Fatturato"
              value={`€${fatturato.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              sub={growthBadge}
            />
            <KpiCard
              icon={<CalendarDays className="w-5 h-5" style={{ color: 'var(--color-brand-icon-color)' }} />}
              label="Appuntamenti"
              value={String(thisMonthCount)}
              sub={<span className="text-xs" style={{ color: TEXT_BODY }}>questo mese</span>}
            />
            <KpiCard
              icon={<CalendarDays className="w-5 h-5" style={{ color: noShowRate > 10 ? '#dc2626' : 'var(--color-brand-icon-color)' }} />}
              label="No-show"
              value={`${noShowRate}%`}
              sub={<span className="text-xs" style={{ color: noShowRate > 10 ? '#dc2626' : TEXT_BODY }}>
                {noShowRate > 10 ? 'Da monitorare' : 'In linea'}
              </span>}
            />
            <KpiCard
              icon={<UserPlus className="w-5 h-5" style={{ color: 'var(--color-brand-icon-color)' }} />}
              label="Nuovi Clienti"
              value={String(newClientsThisMonth)}
              sub={<span className="text-xs" style={{ color: TEXT_BODY }}>questo mese</span>}
            />
          </section>

          <section>
            <p className="text-[10px] uppercase tracking-[0.18em] font-medium mb-3" style={{ color: TEXT_MUTED }}>
              Azioni Rapide
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => store.openModal('isNewClientOpen')}
                className="bg-white px-4 py-2.5 rounded-full border text-sm font-medium flex items-center gap-2 transition-colors hover:bg-stone-50"
                style={{ borderColor: CARD_BORDER, color: TEXT_HEADING, boxShadow: CARD_SHADOW }}
              >
                <Users className="w-4 h-4" />
                Nuovo Cliente
              </button>
              <button
                onClick={() => store.openModal('isNewProductOpen')}
                className="bg-white px-4 py-2.5 rounded-full border text-sm font-medium flex items-center gap-2 transition-colors hover:bg-stone-50"
                style={{ borderColor: CARD_BORDER, color: TEXT_HEADING, boxShadow: CARD_SHADOW }}
              >
                <Plus className="w-4 h-4" />
                Nuovo Prodotto
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl" style={{ fontFamily: '"Playfair Display", serif', color: TEXT_HEADING }}>
                  Prossimi Appuntamenti
                </h2>
                <Link
                  to="/agenda"
                  className="text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                  style={{ color: 'var(--color-brand-primary)' }}
                >
                  Vedi tutti <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <div
                className="bg-white rounded-2xl overflow-hidden"
                style={{ border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
              >
                {upcomingByDay.length === 0 ? (
                  <div className="p-6 text-center text-sm" style={{ color: TEXT_MUTED }}>
                    Nessun appuntamento nei prossimi giorni.
                  </div>
                ) : (
                  upcomingByDay.map(({ dateStr, appts }) => {
                    const dateLabel = format(new Date(dateStr + 'T12:00:00'), 'EEEE d MMM', { locale: it });
                    return (
                      <div key={dateStr}>
                        <div className="px-4 py-2" style={{ backgroundColor: '#f3f3f2', borderBottom: `1px solid ${CARD_BORDER}` }}>
                          <p className="text-[10px] font-semibold uppercase tracking-widest capitalize" style={{ color: TEXT_MUTED }}>
                            {dateLabel}
                          </p>
                        </div>
                        <div>
                          {appts.map(app => {
                            const client = clients.find(c => c.id === app.clientId);
                            const service = services.find(s => s.id === app.serviceId);
                            return (
                              <div
                                key={app.id}
                                className="flex items-center p-3 mx-1 my-0.5 rounded-xl transition-colors cursor-pointer group"
                                style={{ borderBottom: `1px solid transparent` }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8f8f7')}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <div
                                  className="w-14 flex flex-col items-center justify-center pr-3 mr-3 shrink-0"
                                  style={{ borderRight: `1px solid ${CARD_BORDER}` }}
                                >
                                  <span className="text-sm font-semibold" style={{ color: TEXT_HEADING }}>{app.time}</span>
                                  <span className="text-[10px] flex items-center gap-0.5 mt-0.5" style={{ color: TEXT_MUTED }}>
                                    <Clock className="w-2.5 h-2.5" />
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate" style={{ color: TEXT_HEADING }}>
                                    {client?.firstName} {client?.lastName}
                                  </p>
                                  <p className="text-xs truncate" style={{ color: TEXT_BODY }}>{service?.name}</p>
                                </div>
                                <div
                                  className="w-7 h-7 rounded-full border flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                                  style={{ borderColor: CARD_BORDER, color: 'var(--color-brand-primary)' }}
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </div>
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

            <div className="flex flex-col gap-6">

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl" style={{ fontFamily: '"Playfair Display", serif', color: TEXT_HEADING }}>
                    Servizi più richiesti
                  </h2>
                  <Link
                    to="/servizi"
                    className="text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                    style={{ color: 'var(--color-brand-primary)' }}
                  >
                    Vedi tutti <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div
                  className="bg-white rounded-2xl overflow-hidden"
                  style={{ border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
                >
                  {topServices.length === 0 ? (
                    <div className="p-6 text-center text-sm" style={{ color: TEXT_MUTED }}>
                      Nessun servizio prenotato questo mese.
                    </div>
                  ) : (
                    <div className="p-5 flex flex-col gap-5">
                      {topServices.map(({ service, count }) => (
                        <div key={service!.id}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium" style={{ color: TEXT_HEADING }}>{service!.name}</span>
                            <span style={{ color: TEXT_BODY }}>{count}x</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: ACCENT_LIGHT }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.round((count / maxServiceCount) * 100)}%`,
                                backgroundColor: ACCENT,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {lowStockProducts.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl" style={{ fontFamily: '"Playfair Display", serif', color: TEXT_HEADING }}>
                      Attenzione Magazzino
                    </h2>
                    <Link
                      to="/magazzino"
                      className="text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                      style={{ color: 'var(--color-brand-primary)' }}
                    >
                      Vedi tutti <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <div
                    className="bg-white rounded-2xl overflow-hidden"
                    style={{ border: `1px solid #fecaca`, boxShadow: CARD_SHADOW }}
                  >
                    {lowStockProducts.slice(0, 4).map(p => (
                      <div
                        key={p.id}
                        className="p-4 flex items-center gap-3"
                        style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
                      >
                        <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                          <Package2 className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" style={{ color: TEXT_HEADING }}>{p.name}</p>
                          <p className="text-xs" style={{ color: TEXT_MUTED }}>{p.brand}</p>
                        </div>
                        <span className="text-sm font-medium text-red-600 shrink-0">{p.quantity} pz</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>
          </div>
        </>
      )}

    </div>
  );
};
