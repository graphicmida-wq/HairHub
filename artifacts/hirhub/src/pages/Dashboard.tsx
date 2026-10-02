import React from 'react';
import { store } from '../lib/store';
import { useStats } from '../lib/useStats';
import {
  AlertCircle, Plus, Users, ArrowRight,
  Loader2, Package2, TrendingUp, TrendingDown,
  UserPlus, Scissors, CalendarDays, Calendar,
  Clock, ChevronRight, MoreHorizontal, ShoppingBag,
  BarChart3, type LucideIcon,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { formatEuro, formatNumber } from '../lib/stock';
import { BrandDot } from '../lib/product-brand-colors';
import { useTheme } from '../lib/theme';
import { TREND_MONTHS, useKpiTrends } from '../lib/useKpiTrends';
import { Sparkline } from '../components/Sparkline';

const CARD_BORDER = 'var(--color-card-border)';
const CARD_SHADOW = '0 2px 12px rgba(92,88,112,0.04)';
const ACCENT = 'var(--color-brand-dark)';
const ACCENT_LIGHT = 'var(--color-brand-icon-bg)';
const TEXT_HEADING = 'var(--color-brand-dark)';
const TEXT_BODY = 'var(--color-text-body)';
const TEXT_MUTED = 'var(--color-brand-text-muted)';
// Text drawn directly on the page background (adapts when the background is dark)
const PAGE_HEADING = 'var(--color-on-page-brand)';
const PAGE_MUTED = 'var(--color-on-page-muted)';
const PAGE_LINK = 'var(--color-on-page-link)';
// "Prossimi appuntamenti" is a quick glance: the next few, the rest is in the Agenda
const MAX_UPCOMING = 5;

const KpiCard = ({
  icon: Icon,
  label,
  value,
  sub,
  link,
  alert,
  accent,
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: React.ReactNode;
  /** Makes the whole card a link (e.g. Fatturato → Incassi) */
  link?: { to: string; label: string };
  /** A figure to keep an eye on: icon in red */
  alert?: boolean;
  /** This figure's shade of the brand in the Premium look (glow, icon, mini-chart) */
  accent: string;
  /** Month by month values, drawn as a mini-chart in the Premium look */
  trend?: number[];
}) => {
  const Tag = link ? Link : 'div';
  return (
    <Tag
      to={link?.to as string}
      className={cn(
        "kpi-card rounded-2xl p-5 flex flex-col relative overflow-hidden bg-page-card-soft",
        link && "transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
      )}
      style={{
        border: `1px solid ${CARD_BORDER}`,
        boxShadow: CARD_SHADOW,
        '--kpi-accent': alert ? 'var(--color-danger)' : accent,
      } as React.CSSProperties}
    >
      {trend && (
        <Sparkline
          values={trend}
          color="var(--kpi-accent)"
          title={`Andamento degli ultimi ${TREND_MONTHS} mesi, quello in corso tratteggiato`}
          className="premium-only absolute top-5 right-5 w-[38%] max-w-32 h-12"
        />
      )}
      <div
        className="kpi-icon w-10 h-10 rounded-full flex items-center justify-center mb-4 shrink-0"
        style={{ backgroundColor: ACCENT_LIGHT, color: alert ? 'var(--color-danger)' : 'var(--color-brand-dark)' }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-xs uppercase tracking-[0.12em] font-semibold mb-1.5" style={{ color: TEXT_MUTED }}>
        {label}
      </p>
      <p className="text-3xl font-semibold mb-1 leading-none" style={{ fontFamily: '"Playfair Display", serif', color: TEXT_HEADING }}>
        {value}
      </p>
      {sub && <div className="mt-1">{sub}</div>}
      {link && (
        <span className="mt-2 text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-brand-primary)' }}>
          {link.label} <ArrowRight className="w-3.5 h-3.5" />
        </span>
      )}
    </Tag>
  );
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const {
    isLoading, isError,
    clients, services,
    fatturato, fatturatoParts, thisMonthCount, monthGrowthPct,
    noShowRate, newClientsThisMonth,
    topServices, maxServiceCount,
    upcoming,
    lowStockProducts,
    salesOfMonth,
  } = useStats();
  const premium = useTheme() === 'premium';
  const trends = useKpiTrends(premium);

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
          <p className="text-xs uppercase tracking-[0.15em] font-semibold mb-1.5" style={{ color: PAGE_MUTED }}>
            Bentornato
          </p>
          <h1 className="text-4xl" style={{ fontFamily: '"Playfair Display", serif', color: PAGE_HEADING }}>
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
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: PAGE_MUTED }} />
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 border border-red-100 rounded-2xl p-4">
          <AlertCircle className="w-4 h-4 shrink-0" />Errore nel caricamento dei dati.
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={TrendingUp}
              accent="var(--pm-shade-1)"
              trend={trends.revenue}
              label="Fatturato"
              link={{ to: '/incassi', label: 'Vedi incassi' }}
              value={`€${fatturato.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              sub={
                <div className="flex flex-col gap-0.5 text-xs" style={{ color: TEXT_BODY }}>
                  <span>Servizi {formatEuro(fatturatoParts.servicesRevenue)}</span>
                  <span>Prodotti in appuntamento {formatEuro(fatturatoParts.appointmentProductsRevenue)}</span>
                  <span>Vendite al banco {formatEuro(fatturatoParts.counterRevenue)}</span>
                </div>
              }
            />
            <KpiCard
              icon={CalendarDays}
              accent="var(--pm-shade-2)"
              trend={trends.count}
              label="Appuntamenti"
              value={String(thisMonthCount)}
              sub={growthBadge ?? <span className="text-xs" style={{ color: TEXT_BODY }}>questo mese</span>}
            />
            <KpiCard
              icon={CalendarDays}
              alert={noShowRate > 10}
              accent="var(--pm-shade-3)"
              trend={trends.noShowRate}
              label="No-show"
              value={`${noShowRate}%`}
              sub={<span className="text-xs" style={{ color: noShowRate > 10 ? 'var(--color-danger)' : TEXT_BODY }}>
                {noShowRate > 10 ? 'Da monitorare' : 'In linea'}
              </span>}
            />
            <KpiCard
              icon={UserPlus}
              accent="var(--pm-shade-4)"
              trend={trends.newClients}
              label="Nuovi Clienti"
              value={String(newClientsThisMonth)}
              sub={<span className="text-xs" style={{ color: TEXT_BODY }}>questo mese</span>}
            />
          </section>

          <section>
            <p className="text-xs uppercase tracking-[0.12em] font-semibold mb-3" style={{ color: PAGE_MUTED }}>
              Azioni Rapide
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => store.openModal('isNewClientOpen')}
                className="quick-action bg-white px-4 py-2.5 rounded-full border text-sm font-medium flex items-center gap-2 transition-colors hover:bg-stone-50"
                style={{ borderColor: CARD_BORDER, color: TEXT_HEADING, boxShadow: CARD_SHADOW }}
              >
                <Users className="w-4 h-4" />
                Nuovo Cliente
              </button>
              <button
                onClick={() => store.openModal('isNewProductOpen')}
                className="quick-action bg-white px-4 py-2.5 rounded-full border text-sm font-medium flex items-center gap-2 transition-colors hover:bg-stone-50"
                style={{ borderColor: CARD_BORDER, color: TEXT_HEADING, boxShadow: CARD_SHADOW }}
              >
                <Plus className="w-4 h-4" />
                Nuovo Prodotto
              </button>
              <button
                onClick={() => store.openModal('isNewSaleOpen')}
                className="quick-action bg-white px-4 py-2.5 rounded-full border text-sm font-medium flex items-center gap-2 transition-colors hover:bg-stone-50"
                style={{ borderColor: CARD_BORDER, color: TEXT_HEADING, boxShadow: CARD_SHADOW }}
              >
                <ShoppingBag className="w-4 h-4" />
                Nuova Vendita
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div className="flex flex-col gap-6">
              <section className="dash-panel">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl flex items-center gap-3" style={{ fontFamily: '"Playfair Display", serif', color: PAGE_HEADING }}>
                    <span className="premium-only section-icon"><Calendar className="w-4 h-4" /></span>
                    Prossimi Appuntamenti
                  </h2>
                  <Link
                    to="/agenda"
                    className="text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                    style={{ color: PAGE_LINK }}
                  >
                    Vedi tutti <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div
                  className="bg-white rounded-2xl overflow-hidden"
                  style={{ border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
                >
                  {!upcoming ? (
                    <div className="p-6 text-center text-sm" style={{ color: TEXT_MUTED }}>
                      Nessun appuntamento in programma.
                    </div>
                  ) : (() => {
                    const day = new Date(upcoming.dateStr + 'T12:00:00');
                    const dayLabel = isToday(day) ? 'Oggi' : isTomorrow(day) ? 'Domani' : format(day, 'EEEE d MMM', { locale: it });
                    const shown = upcoming.appts.slice(0, MAX_UPCOMING);
                    const more = upcoming.appts.length - shown.length;
                    return (
                      <div>
                        <div className="px-4 py-2" style={{ backgroundColor: 'var(--color-card-subtle)', borderBottom: `1px solid ${CARD_BORDER}` }}>
                          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>
                            {dayLabel}
                          </p>
                        </div>
                        <div className="upcoming-day py-0.5">
                          {shown.map(app => {
                            const client = clients.find(c => c.id === app.clientId);
                            const serviceNames = (app.serviceIds ?? []).map((sid: string) => services.find(s => s.id === sid)?.name).filter(Boolean).join(' · ');
                            const inProgress = isToday(day) && app.time <= upcoming.nowTime;
                            return (
                              <div
                                key={app.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => navigate(`/agenda?open=${app.id}`)}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/agenda?open=${app.id}`); } }}
                                className="flex items-center p-3 mx-1 my-0.5 rounded-xl transition-colors cursor-pointer group"
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-card-hover)')}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                              >
                                <div
                                  className="w-14 flex flex-col items-center justify-center pr-3 mr-3 shrink-0"
                                  style={{ borderRight: `1px solid ${CARD_BORDER}` }}
                                >
                                  <span className="text-sm font-semibold" style={{ color: TEXT_HEADING }}>{app.time}</span>
                                  <span className="text-xs flex items-center gap-0.5 mt-0.5" style={{ color: TEXT_MUTED }}>
                                    <Clock className="w-3 h-3" />
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate" style={{ color: TEXT_HEADING }}>
                                    {client?.firstName} {client?.lastName}
                                  </p>
                                  <p className="text-xs truncate" style={{ color: TEXT_BODY }}>{serviceNames}</p>
                                </div>
                                {inProgress && (
                                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 shrink-0 ml-2">
                                    In corso
                                  </span>
                                )}
                                <div
                                  className="w-7 h-7 rounded-full border flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                                  style={{ borderColor: CARD_BORDER, color: 'var(--color-brand-primary)' }}
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {more > 0 && (
                          <Link
                            to={`/agenda?date=${upcoming.dateStr}`}
                            className="flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors hover:bg-stone-50"
                            style={{ borderTop: `1px solid ${CARD_BORDER}`, color: 'var(--color-brand-primary)' }}
                          >
                            Vedi di più
                            <span style={{ color: TEXT_MUTED }}>· altri {more}</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </section>

              <section className="dash-panel">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl flex items-center gap-3" style={{ fontFamily: '"Playfair Display", serif', color: PAGE_HEADING }}>
                    <span className="premium-only section-icon"><BarChart3 className="w-4 h-4" /></span>
                    Vendite del Mese
                  </h2>
                  <Link
                    to="/vendite"
                    className="text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                    style={{ color: PAGE_LINK }}
                  >
                    Vai a Vendite <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
                <div
                  className="bg-white rounded-2xl p-5 flex flex-col gap-5"
                  style={{ border: `1px solid ${CARD_BORDER}`, boxShadow: CARD_SHADOW }}
                >
                  <div className="grid grid-cols-3 gap-3 items-end">
                    {[
                      { label: 'Venduti', value: `${formatNumber(salesOfMonth.soldPieces)} pz` },
                      { label: 'Incasso', value: formatEuro(salesOfMonth.productRevenue) },
                      { label: 'Usati servizi', value: `${formatNumber(salesOfMonth.usedPackages)} conf.` },
                    ].map(({ label, value }) => (
                      <div key={label} className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.12em] font-semibold mb-1.5" style={{ color: TEXT_MUTED }}>{label}</p>
                        <p className="text-2xl font-semibold leading-none truncate" style={{ fontFamily: '"Playfair Display", serif', color: TEXT_HEADING }}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] font-semibold mb-1" style={{ color: TEXT_MUTED }}>Più venduti</p>
                    {salesOfMonth.topSold.length === 0 ? (
                      <p className="text-sm py-2" style={{ color: TEXT_MUTED }}>Nessuna vendita questo mese.</p>
                    ) : (
                      <ol className="flex flex-col">
                        {salesOfMonth.topSold.map((p, i) => (
                          <li key={p.productId} className="flex items-center gap-3 py-2.5"
                            style={{ borderBottom: i < salesOfMonth.topSold.length - 1 ? `1px solid ${CARD_BORDER}` : undefined }}>
                            <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                              style={{ backgroundColor: ACCENT_LIGHT, color: TEXT_HEADING }}>
                              {i + 1}
                            </span>
                            <span className="flex-1 min-w-0 text-sm font-medium uppercase leading-tight" style={{ color: TEXT_HEADING }}>
                              <BrandDot brand={p.brand} />{p.name}
                            </span>
                            <span className="text-base font-semibold shrink-0" style={{ color: TEXT_HEADING }}>
                              {formatNumber(p.quantity)} pz
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  <button
                    onClick={() => store.openModal('isNewSaleOpen')}
                    className="btn-brand self-start flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" /> Nuova vendita
                  </button>
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-6">

              <section className="dash-panel">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl flex items-center gap-3" style={{ fontFamily: '"Playfair Display", serif', color: PAGE_HEADING }}>
                    <span className="premium-only section-icon"><TrendingUp className="w-4 h-4" /></span>
                    Servizi più richiesti
                  </h2>
                  <Link
                    to="/servizi"
                    className="text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                    style={{ color: PAGE_LINK }}
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
                            <span className="font-medium flex items-center gap-2" style={{ color: TEXT_HEADING }}>
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: service!.color }} />
                              {service!.name}
                            </span>
                            <span style={{ color: TEXT_BODY }}>{count}x</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: ACCENT_LIGHT }}>
                            <div
                              className="svc-bar h-full rounded-full transition-all"
                              style={{
                                width: `${Math.round((count / maxServiceCount) * 100)}%`,
                                backgroundColor: service!.color || ACCENT,
                                color: service!.color || ACCENT,
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
                <section className="dash-panel">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl flex items-center gap-3" style={{ fontFamily: '"Playfair Display", serif', color: PAGE_HEADING }}>
                      <span className="premium-only section-icon"><Package2 className="w-4 h-4" /></span>
                      Attenzione Magazzino
                    </h2>
                    <Link
                      to="/magazzino"
                      className="text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                      style={{ color: PAGE_LINK }}
                    >
                      Vedi tutti <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                  <div
                    className="bg-white rounded-2xl overflow-hidden"
                    style={{ border: '1px solid var(--color-danger-border)', boxShadow: CARD_SHADOW }}
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
                          <p className="font-medium text-sm uppercase leading-tight" style={{ color: TEXT_HEADING }}>{p.name}</p>
                          <p className="text-xs uppercase" style={{ color: TEXT_MUTED }}><BrandDot brand={p.brand} />{p.brand}</p>
                        </div>
                        <span className="text-base font-semibold text-red-600 shrink-0">{p.quantity} pz</span>
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
