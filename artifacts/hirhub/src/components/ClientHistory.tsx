import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, ShoppingBag } from 'lucide-react';
import {
  getListStockMovementsQueryKey, useListAppointments, useListProducts, useListServices, useListStaff,
  useListStockMovements, type Appointment,
} from '@workspace/api-client-react';
import { cn } from '../lib/utils';
import { formatEuro, formatNumber } from '../lib/stock';
import { BrandDot } from '../lib/product-brand-colors';

interface PurchaseLine { name: string; brand: string; quantity: number; unitPrice: number }

type TimelineEntry =
  | { kind: 'appuntamento'; key: string; date: string; time: string; appt: Appointment }
  | { kind: 'acquisto'; key: string; date: string; time: string; lines: PurchaseLine[]; total: number; note: string | null };

const PAGE_SIZE = 10;
const CHIP = "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95";
const CHIP_ON = "btn-brand text-white border-transparent";
const CHIP_OFF = "bg-white text-stone-600 border-stone-200 hover:border-brand-dark/30";
const SECTION_LABEL = "text-[0.6875rem] uppercase tracking-[0.12em] font-semibold text-stone-500";

const fmtDate = (d: string) => format(parseISO(d), 'dd/MM/yyyy');

/** Everything the client card shows about visits and purchases, from appointments + sale movements. */
export function useClientHistory(clientId: string | null) {
  const { data: appointments = [] } = useListAppointments();
  const { data: services = [] } = useListServices();
  const { data: products = [] } = useListProducts();
  const { data: staff = [] } = useListStaff();
  const params = { clientId: clientId ?? '', reason: 'vendita' as const };
  const { data: sales = [] } = useListStockMovements(params, {
    query: { queryKey: getListStockMovementsQueryKey(params), enabled: !!clientId },
  });

  return useMemo(() => {
    const productName = (id: string, fallback?: string) =>
      products.find(p => p.id === id)?.name ?? fallback ?? 'Prodotto eliminato';
    const brandOf = (id: string, fallback?: string) => products.find(p => p.id === id)?.brand ?? fallback ?? '';
    const servicePrice = (a: Appointment, i: number) => {
      const v = a.servicePrices?.[i];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      return services.find(s => s.id === a.serviceIds[i])?.price ?? 0;
    };

    const clientAppts = appointments.filter(a => a.clientId === clientId);
    const completed = clientAppts.filter(a => a.status === 'completato');
    const now = format(new Date(), 'yyyy-MM-dd HH:mm');
    const lastVisit = completed
      .map(a => a.date)
      .filter(d => d <= now.slice(0, 10))
      .sort()
      .pop() ?? null;
    const nextAppt = clientAppts
      .filter(a => a.status === 'prenotato' && `${a.date} ${a.time}` >= now)
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0] ?? null;

    const servicesTotal = completed.reduce(
      (sum, a) => sum + a.serviceIds.reduce((s, _, i) => s + servicePrice(a, i), 0), 0);
    // Sale movements are net of cancellations and appointment corrections
    const productsTotal = sales.reduce((sum, m) => sum - m.quantity * (m.unitPrice ?? 0), 0);

    const byProduct = new Map<string, { name: string; brand: string; quantity: number }>();
    for (const m of sales) {
      const entry = byProduct.get(m.productId) ?? {
        name: productName(m.productId, m.productName), brand: brandOf(m.productId, m.productBrand), quantity: 0,
      };
      entry.quantity -= m.quantity;
      byProduct.set(m.productId, entry);
    }
    const favorites = [...byProduct.values()]
      .filter(f => f.quantity > 0.005)
      .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'it'))
      .slice(0, 6);

    // Over-the-counter purchases: one entry per sale, cancelled sales left out
    const saleGroups = new Map<string, typeof sales>();
    for (const m of sales) {
      if (!m.saleId) continue;
      saleGroups.set(m.saleId, [...(saleGroups.get(m.saleId) ?? []), m]);
    }
    const purchases: TimelineEntry[] = [];
    for (const [saleId, rows] of saleGroups) {
      const net = new Map<string, PurchaseLine>();
      for (const m of rows) {
        const key = `${m.productId}|${m.unitPrice ?? 0}`;
        const line = net.get(key) ?? {
          name: productName(m.productId, m.productName), brand: brandOf(m.productId, m.productBrand),
          quantity: 0, unitPrice: m.unitPrice ?? 0,
        };
        line.quantity -= m.quantity;
        net.set(key, line);
      }
      const lines = [...net.values()].filter(l => l.quantity > 0.005);
      if (lines.length === 0) continue;
      const first = rows.find(m => m.quantity < 0) ?? rows[0]!;
      purchases.push({
        kind: 'acquisto', key: saleId, date: first.date, time: first.time, lines,
        total: lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
        note: first.note ?? null,
      });
    }

    const timeline: TimelineEntry[] = [
      ...clientAppts.map(a => ({ kind: 'appuntamento' as const, key: a.id, date: a.date, time: a.time, appt: a })),
      ...purchases,
    ].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

    return {
      timeline, favorites, productName, brandOf, servicePrice,
      staffName: (id: string | null | undefined) => staff.find(s => s.id === id)?.name ?? null,
      serviceName: (id: string) => services.find(s => s.id === id)?.name ?? 'Servizio',
      serviceColor: (id: string) => services.find(s => s.id === id)?.color ?? null,
      unitOf: (id: string) => products.find(p => p.id === id)?.unitType ?? 'g',
      stats: {
        visits: completed.length, lastVisit, nextAppt,
        servicesTotal, productsTotal, total: servicesTotal + productsTotal,
      },
    };
  }, [appointments, services, products, staff, sales, clientId]);
}

type History = ReturnType<typeof useClientHistory>;

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-stone-50 border border-stone-100 rounded-xl px-3 py-2.5 min-w-0">
    <p className={SECTION_LABEL}>{label}</p>
    <p className="text-lg font-semibold text-stone-900 leading-tight mt-0.5 truncate">{value}</p>
  </div>
);

export const ClientStats = ({ history }: { history: History }) => {
  const { stats, favorites } = history;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Visite" value={String(stats.visits)} />
          <Stat label="Ultima visita" value={stats.lastVisit ? format(parseISO(stats.lastVisit), 'dd/MM/yy') : '—'} />
          <Stat label="Speso" value={formatEuro(stats.total)} />
        </div>
        {stats.total > 0 && (
          <p className="text-xs text-stone-500">
            {formatEuro(stats.servicesTotal)} in servizi · {formatEuro(stats.productsTotal)} in prodotti
          </p>
        )}
        {stats.nextAppt && (
          <p className="text-xs text-stone-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            Prossimo appuntamento: {format(parseISO(stats.nextAppt.date), 'EEE d MMMM', { locale: it })} alle {stats.nextAppt.time}
          </p>
        )}
      </div>

      {favorites.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className={SECTION_LABEL}>Compra di solito</p>
          <div className="flex flex-wrap gap-1.5">
            {favorites.map(f => (
              <span key={f.name} className="text-xs px-2.5 py-1 rounded-full font-medium uppercase"
                style={{ backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-icon-color)' }}>
                <BrandDot brand={f.brand} />{f.name} ×{formatNumber(f.quantity)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const STATUS_CLASS: Record<string, string> = {
  completato: 'bg-green-100 text-green-700',
  annullato: 'bg-red-100 text-red-700',
  'no-show': 'bg-red-100 text-red-700',
  prenotato: 'bg-blue-100 text-blue-700',
};

const AppointmentEntry = ({ appt, history }: { appt: Appointment; history: History }) => {
  const staffName = history.staffName(appt.staffId);
  const sold = (appt.soldProducts ?? []).filter(sp => sp.quantity > 0);
  const servicesTotal = appt.serviceIds.reduce((s, _, i) => s + history.servicePrice(appt, i), 0);
  const soldTotal = sold.reduce((s, sp) => s + sp.quantity * sp.unitPrice, 0);
  const used = appt.usedProducts?.length
    ? appt.usedProducts.map(up => ({ name: history.productName(up.productId), qty: `${formatNumber(up.quantityUsed)}${history.unitOf(up.productId)}` }))
    : (appt.usedProductIds ?? []).map(id => ({ name: history.productName(id), qty: '' }));

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="w-4 h-4 text-stone-400 shrink-0" />
          <span className="text-sm font-medium text-stone-900">
            {fmtDate(appt.date)} alle {appt.time}
            {staffName && <span className="font-normal text-stone-500"> · con {staffName}</span>}
          </span>
        </div>
        <span className={cn('shrink-0 text-[0.625rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-sm', STATUS_CLASS[appt.status] ?? STATUS_CLASS.prenotato)}>
          {appt.status}
        </span>
      </div>

      <div className="pl-6 flex flex-col gap-1.5">
        {appt.serviceIds.length > 0 && (
          <p className="text-sm text-stone-700">
            {appt.serviceIds.map((sid, i) => (
              <span key={`${sid}-${i}`}>
                {i > 0 && ' · '}
                {history.serviceColor(sid) && (
                  <span aria-hidden className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-[-1px]" style={{ backgroundColor: history.serviceColor(sid)! }} />
                )}
                {history.serviceName(sid)}{' '}
                <span className="text-stone-400">{formatEuro(history.servicePrice(appt, i))}</span>
              </span>
            ))}
          </p>
        )}

        {appt.notes && (
          <p className="text-xs text-stone-500 border-l-2 border-stone-100 pl-2 italic">"{appt.notes}"</p>
        )}

        {used.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-stone-500 mr-0.5">Usati:</span>
            {used.map((u, i) => (
              <span key={i} className="text-[0.625rem] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full border border-stone-200">
                <span className="uppercase">{u.name}</span> {u.qty}
              </span>
            ))}
          </div>
        )}

        {sold.length > 0 && (
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-stone-500 flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> Acquistati:</span>
            {sold.map((sp, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-stone-800"><BrandDot brand={history.brandOf(sp.productId)} /><span className="uppercase">{history.productName(sp.productId)}</span> <span className="whitespace-nowrap">×{sp.quantity}</span></span>
                <span className="text-stone-700 tabular-nums">{formatEuro(sp.quantity * sp.unitPrice)}</span>
              </div>
            ))}
          </div>
        )}

        {appt.status === 'completato' && (servicesTotal > 0 || soldTotal > 0) && (
          <div className="flex items-center justify-between border-t border-stone-100 pt-1.5 mt-0.5 text-sm">
            <span className="text-stone-500">Totale visita</span>
            <span className="font-semibold text-stone-900 tabular-nums">{formatEuro(servicesTotal + soldTotal)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const PurchaseEntry = ({ entry }: { entry: Extract<TimelineEntry, { kind: 'acquisto' }> }) => (
  <div className="rounded-xl p-3 flex flex-col gap-2 border"
    style={{ backgroundColor: 'var(--color-brand-light)', borderColor: 'var(--color-brand-icon-bg)' }}>
    <div className="flex items-center gap-2">
      <ShoppingBag className="w-4 h-4 shrink-0" style={{ color: 'var(--color-brand-icon-color)' }} />
      <span className="text-sm font-medium text-stone-900">
        {fmtDate(entry.date)} alle {entry.time}
        <span className="font-normal text-stone-500"> · Acquisto al banco</span>
      </span>
    </div>
    <div className="pl-6 flex flex-col gap-0.5">
      {entry.lines.map((l, i) => (
        <div key={i} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-stone-800"><BrandDot brand={l.brand} /><span className="uppercase">{l.name}</span> <span className="whitespace-nowrap">×{formatNumber(l.quantity)}</span></span>
          <span className="text-stone-700 tabular-nums">{formatEuro(l.quantity * l.unitPrice)}</span>
        </div>
      ))}
      {entry.note && <p className="text-xs text-stone-500 italic mt-1">"{entry.note}"</p>}
      {entry.lines.length > 1 && (
        <div className="flex items-center justify-between border-t border-stone-200/70 pt-1.5 mt-1 text-sm">
          <span className="text-stone-500">Totale</span>
          <span className="font-semibold text-stone-900 tabular-nums">{formatEuro(entry.total)}</span>
        </div>
      )}
    </div>
  </div>
);

type Filter = 'tutto' | 'appuntamenti' | 'acquisti';

export const ClientTimeline = ({ history }: { history: History }) => {
  const [filter, setFilter] = useState<Filter>('tutto');
  const [visible, setVisible] = useState(PAGE_SIZE);

  // "Acquisti" = anything the client bought: counter sales and visits with products sold
  const entries = history.timeline.filter(e =>
    filter === 'tutto' ? true
      : filter === 'appuntamenti' ? e.kind === 'appuntamento'
        : e.kind === 'acquisto' || (e.appt.soldProducts ?? []).some(sp => sp.quantity > 0));

  const choose = (f: Filter) => { setFilter(f); setVisible(PAGE_SIZE); };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="font-medium text-stone-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-stone-400" />
          Storico
        </h4>
        <div className="flex gap-1.5">
          {([['tutto', 'Tutto'], ['appuntamenti', 'Appuntamenti'], ['acquisti', 'Acquisti']] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => choose(value)}
              className={cn(CHIP, filter === value ? CHIP_ON : CHIP_OFF)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-stone-500 italic px-2">
          {filter === 'acquisti' ? 'Nessun acquisto.' : filter === 'appuntamenti' ? 'Nessun appuntamento.' : 'Nessun appuntamento o acquisto.'}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.slice(0, visible).map(e => e.kind === 'appuntamento'
            ? <AppointmentEntry key={e.key} appt={e.appt} history={history} />
            : <PurchaseEntry key={e.key} entry={e} />)}
          {entries.length > visible && (
            <button type="button" onClick={() => setVisible(v => v + PAGE_SIZE)}
              className="self-center text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-full px-5 py-2 hover:bg-stone-50">
              Mostra altri ({entries.length - visible})
            </button>
          )}
        </div>
      )}
    </div>
  );
};
