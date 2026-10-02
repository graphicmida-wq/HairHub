import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData } from '@tanstack/react-query';
import { parseISO } from 'date-fns';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertCircle, ArrowRight, Loader2, Receipt, Scissors, ShoppingBag, TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';
import {
  getListStockMovementsQueryKey, useListAppointments, useListClients, useListServices, useListStaff,
  useListStockMovements, type Appointment, type ListStockMovementsParams, type StockMovement,
} from '@workspace/api-client-react';
import { cn } from '../lib/utils';
import { formatEuro } from '../lib/stock';
import { previousPeriod, timeSlots, ymd } from '../lib/period';
import { PeriodPicker, usePeriod } from '../components/PeriodPicker';
import { useFontScale } from '../lib/font-scale';

// Validated categorical trio (blue / orange / aqua), in this order
const SERIES = {
  services: { color: '#2a78d6', label: 'Servizi' },
  apptProducts: { color: '#eb6834', label: 'Prodotti in appuntamento' },
  counter: { color: '#1baf7a', label: 'Vendite al banco' },
} as const;
type SeriesKey = keyof typeof SERIES;

const CARD = "bg-white rounded-2xl border border-stone-100 shadow-sm";
const LABEL = "text-xs uppercase tracking-[0.12em] font-semibold";
const WEEKDAYS = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

/** Round axis: 4 steps of 1, 2, 2.5 or 5 × 10ⁿ covering the highest column. */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 50, 100];
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

/** Whole euros for headline figures: €3.394 */
const euroRound = (n: number) => `€${Math.round(n).toLocaleString('it-IT')}`;

interface Summary {
  services: number;
  listServices: number;
  apptProducts: number;
  counter: number;
  total: number;
  visits: number;
  noShows: number;
  cancelled: number;
  clients: Set<string>;
}

function inRange(date: string, from: string, to: string) {
  return date >= from && date <= to;
}

/**
 * Revenue of a period = services of completed appointments + products sold during
 * them + over-the-counter sales (sale movements without an appointment, net of
 * cancellations). Same rule as the Dashboard.
 */
function summarize(
  appointments: Appointment[], sales: StockMovement[], from: string, to: string,
  price: (a: Appointment, i: number) => number, listPrice: (a: Appointment, i: number) => number,
): Summary {
  const s: Summary = { services: 0, listServices: 0, apptProducts: 0, counter: 0, total: 0, visits: 0, noShows: 0, cancelled: 0, clients: new Set() };
  for (const a of appointments) {
    if (!inRange(a.date, from, to)) continue;
    if (a.status === 'no-show') s.noShows++;
    if (a.status === 'annullato') s.cancelled++;
    if (a.status !== 'completato') continue;
    s.visits++;
    s.clients.add(a.clientId);
    a.serviceIds.forEach((_, i) => { s.services += price(a, i); s.listServices += listPrice(a, i); });
    for (const sp of a.soldProducts ?? []) s.apptProducts += sp.quantity * sp.unitPrice;
  }
  for (const m of sales) {
    if (m.appointmentId == null && inRange(m.date, from, to)) s.counter -= m.quantity * (m.unitPrice ?? 0);
  }
  s.total = s.services + s.apptProducts + s.counter;
  return s;
}

const Delta = ({ current, previous, vs }: { current: number; previous: number; vs: string }) => {
  if (!previous) return <span className="text-xs text-stone-400">nessun dato per il confronto</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={cn('text-xs font-semibold flex items-center gap-1', pct === 0 ? 'text-stone-500' : up ? 'text-emerald-700' : 'text-red-600')}>
      {pct !== 0 && <Icon className="w-3.5 h-3.5" />}
      {up ? '+' : ''}{pct}% rispetto {vs}
    </span>
  );
};

const Kpi = ({ icon, label, value, sub, delta }: { icon: ReactNode; label: string; value: string; sub?: ReactNode; delta?: ReactNode }) => (
  <div className={cn(CARD, "p-4 md:p-5 flex flex-col gap-1")}>
    <div className="w-9 h-9 rounded-full flex items-center justify-center mb-2"
      style={{ backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-dark)' }}>
      {icon}
    </div>
    <p className={LABEL} style={{ color: 'var(--color-brand-text-muted)' }}>{label}</p>
    <p className="text-xl sm:text-2xl md:text-3xl font-semibold leading-none" style={{ fontFamily: '"Playfair Display", serif', color: 'var(--color-brand-dark)' }}>{value}</p>
    {sub && <div className="text-xs text-stone-500 mt-1">{sub}</div>}
    {delta && <div className="mt-1">{delta}</div>}
  </div>
);

const MiniStat = ({ label, value, sub }: { label: string; value: string; sub?: ReactNode }) => (
  <div className={cn(CARD, "px-4 py-3")}>
    <p className={LABEL} style={{ color: 'var(--color-brand-text-muted)' }}>{label}</p>
    <p className="text-xl font-semibold text-stone-900 mt-1">{value}</p>
    {sub && <div className="text-xs text-stone-500 mt-0.5">{sub}</div>}
  </div>
);

interface ChartRow { key: string; label: string; title: string; services: number; apptProducts: number; counter: number }

const ChartTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: ChartRow }[] }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]!.payload;
  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="text-stone-500 mb-1">{row.title}</p>
      {(Object.keys(SERIES) as SeriesKey[]).map(k => (
        <div key={k} className="flex items-center gap-2">
          <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: SERIES[k].color }} />
          <span className="font-semibold text-stone-900">{formatEuro(row[k])}</span>
          <span className="text-stone-500">{SERIES[k].label}</span>
        </div>
      ))}
      <div className="border-t border-stone-100 mt-1 pt-1 font-semibold text-stone-900">
        Totale {formatEuro(row.services + row.apptProducts + row.counter)}
      </div>
    </div>
  );
};

const SectionTitle = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <div className="flex items-center justify-between gap-2 mb-3">
    <h2 className="text-xl font-serif text-on-page">{children}</h2>
    {action}
  </div>
);

export const Revenue = () => {
  const fontScale = useFontScale();
  const period = usePeriod('mese');
  const { mode, from, to } = period;
  const prev = previousPeriod(mode, from, to);
  const range = { from: ymd(from), to: ymd(to) };
  const prevRange = { from: ymd(prev.from), to: ymd(prev.to) };

  const { data: appointments = [], isLoading: loadingAppts, isError } = useListAppointments();
  const { data: services = [] } = useListServices();
  const { data: clients = [] } = useListClients();
  const { data: staff = [] } = useListStaff();
  const salesParams: ListStockMovementsParams = { ...range, reason: 'vendita' };
  const prevSalesParams: ListStockMovementsParams = { ...prevRange, reason: 'vendita' };
  const { data: sales = [], isLoading: loadingSales, isFetching } = useListStockMovements(salesParams, {
    query: { queryKey: getListStockMovementsQueryKey(salesParams), placeholderData: keepPreviousData, refetchOnMount: 'always' },
  });
  const { data: prevSales = [] } = useListStockMovements(prevSalesParams, {
    query: { queryKey: getListStockMovementsQueryKey(prevSalesParams), placeholderData: keepPreviousData },
  });

  const report = useMemo(() => {
    const serviceById = new Map(services.map(s => [s.id, s]));
    const listPrice = (a: Appointment, i: number) => {
      const v = a.serviceListPrices?.[i];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      return serviceById.get(a.serviceIds[i]!)?.price ?? 0;
    };
    const price = (a: Appointment, i: number) => {
      const v = a.servicePrices?.[i];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      return listPrice(a, i);
    };

    const cur = summarize(appointments, sales, range.from, range.to, price, listPrice);
    const before = summarize(appointments, prevSales, prevRange.from, prevRange.to, price, listPrice);

    // Chart: one column per day (or month), stacked by source of revenue
    const { slots, keyOf } = timeSlots(mode, from, to);
    const rows: ChartRow[] = slots.map(s => ({ ...s, services: 0, apptProducts: 0, counter: 0 }));
    const rowByKey = new Map(rows.map(r => [r.key, r]));

    const perService = new Map<string, { name: string; color: string; count: number; revenue: number }>();
    const perStaff = new Map<string, { name: string; color: string; visits: number; services: number; products: number }>();
    const perWeekday = Array.from({ length: 7 }, () => ({ visits: 0, total: 0 }));
    const perClient = new Map<string, { visits: number; total: number }>();

    for (const a of appointments) {
      if (a.status !== 'completato' || !inRange(a.date, range.from, range.to)) continue;
      let svcTotal = 0;
      a.serviceIds.forEach((sid, i) => {
        const p = price(a, i);
        svcTotal += p;
        const svc = serviceById.get(sid);
        const entry = perService.get(sid) ?? { name: svc?.name ?? 'Servizio eliminato', color: svc?.color ?? '#94a3b8', count: 0, revenue: 0 };
        entry.count++;
        entry.revenue += p;
        perService.set(sid, entry);
      });
      const prodTotal = (a.soldProducts ?? []).reduce((s, sp) => s + sp.quantity * sp.unitPrice, 0);

      const row = rowByKey.get(keyOf(a.date));
      if (row) { row.services += svcTotal; row.apptProducts += prodTotal; }

      const staffKey = a.staffId ?? '';
      const member = staff.find(m => m.id === a.staffId);
      const st = perStaff.get(staffKey) ?? { name: member?.name ?? 'Non assegnato', color: member?.color ?? '#94a3b8', visits: 0, services: 0, products: 0 };
      st.visits++; st.services += svcTotal; st.products += prodTotal;
      perStaff.set(staffKey, st);

      const wd = perWeekday[parseISO(a.date).getDay()]!;
      wd.visits++; wd.total += svcTotal + prodTotal;

      const cl = perClient.get(a.clientId) ?? { visits: 0, total: 0 };
      cl.visits++; cl.total += svcTotal + prodTotal;
      perClient.set(a.clientId, cl);
    }
    for (const m of sales) {
      if (m.appointmentId != null || !inRange(m.date, range.from, range.to)) continue;
      const amount = -m.quantity * (m.unitPrice ?? 0);
      const row = rowByKey.get(keyOf(m.date));
      if (row) row.counter += amount;
      perWeekday[parseISO(m.date).getDay()]!.total += amount;
      if (m.clientId) {
        const cl = perClient.get(m.clientId) ?? { visits: 0, total: 0 };
        cl.total += amount;
        perClient.set(m.clientId, cl);
      }
    }

    // New clients: their very first appointment falls in this period
    const firstVisit = new Map<string, string>();
    for (const a of appointments) {
      const f = firstVisit.get(a.clientId);
      if (!f || a.date < f) firstVisit.set(a.clientId, a.date);
    }
    const newClients = [...firstVisit.values()].filter(d => inRange(d, range.from, range.to)).length;

    const clientName = (id: string) => {
      const c = clients.find(cl => cl.id === id);
      return c ? `${c.firstName} ${c.lastName}`.trim() : 'Cliente eliminato';
    };

    return {
      cur, before, rows, newClients,
      services: [...perService.values()].sort((a, b) => b.revenue - a.revenue),
      staff: [...perStaff.values()].sort((a, b) => (b.services + b.products) - (a.services + a.products)),
      weekdays: [1, 2, 3, 4, 5, 6, 0].map(d => ({ name: WEEKDAYS[d]!, ...perWeekday[d]! })),
      topClients: [...perClient.entries()]
        .map(([id, v]) => ({ id, name: clientName(id), ...v }))
        .filter(c => c.total > 0.005)
        .sort((a, b) => b.total - a.total)
        .slice(0, 8),
    };
  }, [appointments, sales, prevSales, services, clients, staff, mode, range.from, range.to, prevRange.from, prevRange.to]);

  const { cur, before } = report;
  const avgTicket = cur.visits ? (cur.services + cur.apptProducts) / cur.visits : 0;
  const prevAvgTicket = before.visits ? (before.services + before.apptProducts) / before.visits : 0;
  const products = cur.apptProducts + cur.counter;
  const discounts = Math.max(0, cur.listServices - cur.services);
  const noShowRate = cur.visits + cur.noShows ? Math.round((cur.noShows / (cur.visits + cur.noShows)) * 100) : 0;
  const hasChart = report.rows.some(r => r.services || r.apptProducts || r.counter);
  const activeWeekdays = report.weekdays.filter(w => w.visits > 0 || Math.abs(w.total) > 0.005);
  const maxWeekday = Math.max(1, ...activeWeekdays.map(w => w.total));
  const yTicks = niceTicks(Math.max(0, ...report.rows.map(r => r.services + r.apptProducts + r.counter)));
  const servicesTotal = report.services.reduce((s, x) => s + x.revenue, 0);

  return (
    <div className="flex flex-col gap-6 page-enter">
      <h1 className="text-3xl font-serif text-on-page">Incassi</h1>

      <div className="flex flex-col gap-3">
        <PeriodPicker period={period} />
      </div>

      {loadingAppts || loadingSales ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-on-page-muted" /></div>
      ) : isError ? (
        <div className="py-12 flex flex-col items-center justify-center text-red-500 gap-2">
          <AlertCircle className="w-8 h-8 opacity-70" />
          <p className="text-sm">Errore nel caricamento degli incassi.</p>
        </div>
      ) : (
        <div className={cn("flex flex-col gap-6 transition-opacity", isFetching && "opacity-70")}>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Kpi icon={<Wallet className="w-4 h-4" />} label="Totale incassato" value={euroRound(cur.total)}
              sub="Servizi + prodotti in appuntamento + banco"
              delta={<Delta current={cur.total} previous={before.total} vs={prev.vs} />} />
            <Kpi icon={<Scissors className="w-4 h-4" />} label="Servizi" value={euroRound(cur.services)}
              sub={cur.total ? `${Math.round((cur.services / cur.total) * 100)}% del totale` : undefined}
              delta={<Delta current={cur.services} previous={before.services} vs={prev.vs} />} />
            <Kpi icon={<ShoppingBag className="w-4 h-4" />} label="Prodotti" value={euroRound(products)}
              sub={<>In appuntamento {formatEuro(cur.apptProducts)} · al banco {formatEuro(cur.counter)}</>}
              delta={<Delta current={products} previous={before.apptProducts + before.counter} vs={prev.vs} />} />
            <Kpi icon={<Receipt className="w-4 h-4" />} label="Spesa media per visita" value={formatEuro(avgTicket)}
              sub="Servizi e prodotti di ogni appuntamento"
              delta={<Delta current={avgTicket} previous={prevAvgTicket} vs={prev.vs} />} />
          </section>

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniStat label="Visite completate" value={String(cur.visits)}
              sub={<Delta current={cur.visits} previous={before.visits} vs={prev.vs} />} />
            <MiniStat label="Clienti" value={String(cur.clients.size)}
              sub={`${report.newClients} ${report.newClients === 1 ? 'nuovo' : 'nuovi'}`} />
            <MiniStat label="No-show" value={`${cur.noShows}`}
              sub={`${noShowRate}% · ${cur.cancelled} annullati`} />
            <MiniStat label="Sconti sui servizi" value={formatEuro(discounts)}
              sub={cur.listServices ? `listino ${formatEuro(cur.listServices)}` : undefined} />
          </section>

          {report.rows.length > 0 && (
            <section className={cn(CARD, "p-4 md:p-5")}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-medium text-stone-900">Andamento incassi</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600">
                  {(Object.keys(SERIES) as SeriesKey[]).map(k => (
                    <span key={k} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SERIES[k].color }} />{SERIES[k].label}
                    </span>
                  ))}
                </div>
              </div>
              {hasChart ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.rows} barCategoryGap="22%" margin={{ top: 4, right: 4, left: -6, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#EFEBE3" />
                      <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#E3DED3' }}
                        tick={{ fontSize: 11 * fontScale, fill: '#8A8578' }} interval="preserveStartEnd" minTickGap={6} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 * fontScale, fill: '#8A8578' }} width={54 * fontScale}
                        ticks={yTicks} domain={[0, yTicks[yTicks.length - 1]!]}
                        tickFormatter={v => `€${Number(v).toLocaleString('it-IT')}`} />
                      <Tooltip cursor={{ fill: 'rgba(32,48,79,0.05)' }} content={<ChartTooltip />} />
                      {/* white edge = the 2px gap between stacked segments */}
                      <Bar dataKey="services" stackId="r" fill={SERIES.services.color} stroke="#fff" strokeWidth={1} maxBarSize={24} />
                      <Bar dataKey="apptProducts" stackId="r" fill={SERIES.apptProducts.color} stroke="#fff" strokeWidth={1} maxBarSize={24} />
                      <Bar dataKey="counter" stackId="r" fill={SERIES.counter.color} stroke="#fff" strokeWidth={1} maxBarSize={24} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-stone-400">Nessun incasso nel periodo.</p>
              )}
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <SectionTitle>Per servizio</SectionTitle>
              <div className={cn(CARD, "overflow-hidden")}>
                {report.services.length === 0 ? (
                  <p className="py-8 text-center text-sm text-stone-400">Nessun servizio nel periodo.</p>
                ) : report.services.map(s => (
                  <div key={s.name} className="px-4 py-3 border-b border-stone-50 last:border-b-0 flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{s.name}</p>
                      <p className="text-xs text-stone-500">
                        {s.count} {s.count === 1 ? 'volta' : 'volte'} · media {formatEuro(s.revenue / s.count)}
                        {servicesTotal ? ` · ${Math.round((s.revenue / servicesTotal) * 100)}%` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-stone-900 tabular-nums">{formatEuro(s.revenue)}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle>Per operatore</SectionTitle>
              <div className={cn(CARD, "overflow-hidden")}>
                {report.staff.length === 0 ? (
                  <p className="py-8 text-center text-sm text-stone-400">Nessuna visita nel periodo.</p>
                ) : report.staff.map(m => (
                  <div key={m.name} className="px-4 py-3 border-b border-stone-50 last:border-b-0 flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{m.name}</p>
                      <p className="text-xs text-stone-500">
                        {m.visits} {m.visits === 1 ? 'visita' : 'visite'} · servizi {formatEuro(m.services)} · prodotti {formatEuro(m.products)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-stone-900 tabular-nums">{formatEuro(m.services + m.products)}</span>
                  </div>
                ))}
                <p className="px-4 py-2 text-[0.6875rem] text-stone-400 bg-stone-50">Le vendite al banco non hanno un operatore e non sono incluse qui.</p>
              </div>
            </section>

            <section>
              <SectionTitle>Giorni della settimana</SectionTitle>
              <div className={cn(CARD, "p-4 flex flex-col gap-3")}>
                {activeWeekdays.length === 0 && <p className="py-4 text-center text-sm text-stone-400">Nessun incasso nel periodo.</p>}
                {activeWeekdays.map(w => (
                  <div key={w.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-stone-800">{w.name} <span className="text-xs text-stone-400">· {w.visits} visite</span></span>
                      <span className="font-semibold text-stone-900 tabular-nums">{formatEuro(w.total)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-brand-icon-bg)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.round((w.total / maxWeekday) * 100)}%`, backgroundColor: 'var(--color-brand-dark)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionTitle>Migliori clienti</SectionTitle>
              <div className={cn(CARD, "overflow-hidden")}>
                {report.topClients.length === 0 ? (
                  <p className="py-8 text-center text-sm text-stone-400">Nessun cliente nel periodo.</p>
                ) : report.topClients.map((c, i) => (
                  <div key={c.id} className="px-4 py-3 border-b border-stone-50 last:border-b-0 flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{ backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-dark)' }}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{c.name}</p>
                      <p className="text-xs text-stone-500">{c.visits} {c.visits === 1 ? 'visita' : 'visite'}</p>
                    </div>
                    <span className="text-sm font-semibold text-stone-900 tabular-nums">{formatEuro(c.total)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <Link to="/vendite"
            className={cn(CARD, "p-4 flex items-center gap-3 hover:border-brand-dark/30 hover:shadow-md transition-all")}>
            <span className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-dark)' }}>
              <ShoppingBag className="w-4 h-4" />
            </span>
            <span className="flex-1 text-sm text-stone-700">
              Il dettaglio dei prodotti (pezzi venduti, usati nei servizi, movimenti) è in <strong>Vendite</strong>.
            </span>
            <ArrowRight className="w-4 h-4 text-stone-400" />
          </Link>
        </div>
      )}
    </div>
  );
};
