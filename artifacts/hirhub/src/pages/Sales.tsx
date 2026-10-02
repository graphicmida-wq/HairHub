import { useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertCircle, Loader2, Package2, Plus, Receipt, Scissors, Search, ShoppingBag, X,
} from 'lucide-react';
import {
  getListStockMovementsQueryKey, useCancelSale, useListProducts, useListStockMovements,
  type ListStockMovementsParams, type Product, type StockMovement,
} from '@workspace/api-client-react';
import { store } from '../lib/store';
import { cn } from '../lib/utils';
import { toast } from '../components/Toast';
import {
  formatEuro, formatNumber, formatQty, formatSignedQty, formatStock, invalidateStock,
  movementKind, movementLabel, toPackages, type MovementKind,
} from '../lib/stock';
import { BrandDot, tintTileStyle, useBrandColors } from '../lib/product-brand-colors';
import { timeSlots, ymd } from '../lib/period';
import { PeriodPicker, usePeriod } from '../components/PeriodPicker';
import { useFontScale } from '../lib/font-scale';

const KINDS: { value: MovementKind | 'tutti'; label: string }[] = [
  { value: 'tutti', label: 'Tutti' },
  { value: 'vendite', label: 'Vendite' },
  { value: 'uso', label: 'Uso nei servizi' },
];

// Validated categorical pair (blue / orange): distinct for colour-blind readers too
const SERIES_SOLD = '#2a78d6';
const SERIES_USED = '#eb6834';

const CARD = "bg-white rounded-2xl border border-stone-100 shadow-sm";
const CHIP = "shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95";
const CHIP_ON = "btn-brand text-white border-transparent";
const CHIP_OFF = "bg-white text-stone-600 border-stone-200 hover:border-brand-dark/30";
const PAGE_SIZE = 40;

interface Bucket { key: string; label: string; title: string; sold: number; used: number }

interface ProductRow {
  productId: string;
  name: string;
  brand: string;
  sold: number;
  revenue: number;
  used: Map<string, number>;
  usedPackages: number;
}

function formatUsed(used: Map<string, number>): string {
  const parts = [...used.entries()].filter(([, q]) => Math.abs(q) >= 0.05).map(([unit, q]) => formatQty(q, unit));
  return parts.length ? parts.join(' + ') : '—';
}

const KpiTile = ({ icon, label, value, sub, className }: {
  icon: ReactNode; label: string; value: string; sub?: string; className?: string;
}) => (
  <div className={cn(CARD, "p-4 md:p-5 flex flex-col", className)}>
    <div className="w-9 h-9 rounded-full flex items-center justify-center mb-3"
      style={{ backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-dark)' }}>
      {icon}
    </div>
    <p className="text-xs uppercase tracking-[0.12em] font-semibold mb-1.5" style={{ color: 'var(--color-brand-text-muted)' }}>{label}</p>
    <p className="text-2xl md:text-3xl font-semibold leading-none" style={{ fontFamily: '"Playfair Display", serif', color: 'var(--color-brand-dark)' }}>
      {value}
    </p>
    {sub && <p className="text-xs text-stone-500 mt-1.5">{sub}</p>}
  </div>
);

const ChartTooltip = ({ active, payload, unitNote }: {
  active?: boolean;
  payload?: { payload: Bucket }[];
  unitNote: string;
}) => {
  if (!active || !payload?.length) return null;
  const b = payload[0]!.payload;
  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="text-stone-500 mb-1">{b.title}</p>
      <div className="flex items-center gap-2">
        <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: SERIES_SOLD }} />
        <span className="font-semibold text-stone-900">{formatNumber(b.sold)} pz</span>
        <span className="text-stone-500">venduti</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: SERIES_USED }} />
        <span className="font-semibold text-stone-900">{formatNumber(b.used)} {unitNote}</span>
        <span className="text-stone-500">usati nei servizi</span>
      </div>
    </div>
  );
};

export const Sales = () => {
  const fontScale = useFontScale();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const pinnedId = searchParams.get('prodotto');

  const period = usePeriod('mese');
  const { mode, from, to } = period;
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [kind, setKind] = useState<MovementKind | 'tutti'>('tutti');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const params: ListStockMovementsParams = { from: ymd(from), to: ymd(to), ...(pinnedId ? { productId: pinnedId } : {}) };

  const { data: products = [] } = useListProducts();
  const { data: movements = [], isLoading, isError, isFetching } = useListStockMovements(params, {
    query: {
      queryKey: getListStockMovementsQueryKey(params),
      placeholderData: keepPreviousData,
      refetchOnMount: 'always',
    },
  });

  const { mutate: cancelSale, isPending: isCancelling } = useCancelSale({
    mutation: {
      onSuccess: () => {
        invalidateStock(queryClient);
        toast.show('Vendita annullata, prodotti tornati in magazzino');
      },
      onError: (err: unknown) => {
        const msg = (err as { data?: { message?: string } })?.data?.message;
        toast.show(msg ?? "Errore durante l'annullamento", 'error');
      },
    },
  });

  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const colorOf = useBrandColors();
  const pinned: Product | undefined = pinnedId ? productById.get(pinnedId) : undefined;
  const pinnedName = pinned?.name ?? movements[0]?.productName ?? 'Prodotto';
  const pinnedColor = colorOf(pinned?.brand ?? movements[0]?.productBrand);

  const query = searchTerm.trim().toLowerCase();
  const filtered = useMemo(() => (
    query && !pinnedId
      ? movements.filter(m => m.productName.toLowerCase().includes(query) || m.productBrand.toLowerCase().includes(query))
      : movements
  ), [movements, query, pinnedId]);

  const suggestions = query && !pinnedId
    ? products.filter(p => p.name.toLowerCase().includes(query) || p.brand.toLowerCase().includes(query)).slice(0, 6)
    : [];

  const { buckets, totals, rows } = useMemo(() => {
    const { slots, keyOf } = timeSlots(mode, from, to);
    const buckets: Bucket[] = slots.map(slot => ({ ...slot, sold: 0, used: 0 }));
    const bucketByKey = new Map(buckets.map(b => [b.key, b]));
    const rowsById = new Map<string, ProductRow>();
    let sold = 0, revenue = 0, usedPackages = 0;
    const usedByUnit = new Map<string, number>();
    const soldProducts = new Set<string>();
    const services = new Set<string>();

    for (const m of filtered) {
      if (m.reason !== 'vendita' && m.reason !== 'uso_servizio') continue;
      const current = productById.get(m.productId);
      const row = rowsById.get(m.productId) ?? {
        productId: m.productId, name: current?.name ?? m.productName, brand: current?.brand ?? m.productBrand,
        sold: 0, revenue: 0, used: new Map<string, number>(), usedPackages: 0,
      };
      rowsById.set(m.productId, row);
      const bucket = bucketByKey.get(keyOf(m.date));
      if (m.reason === 'vendita') {
        sold -= m.quantity;
        revenue -= m.quantity * (m.unitPrice ?? 0);
        row.sold -= m.quantity;
        row.revenue -= m.quantity * (m.unitPrice ?? 0);
        if (bucket) bucket.sold -= m.quantity;
      } else {
        const packages = toPackages(-m.quantity, m.unit, productById.get(m.productId)) ?? 0;
        usedPackages += packages;
        usedByUnit.set(m.unit, (usedByUnit.get(m.unit) ?? 0) - m.quantity);
        row.used.set(m.unit, (row.used.get(m.unit) ?? 0) - m.quantity);
        row.usedPackages += packages;
        if (bucket) bucket.used += packages;
        if (m.appointmentId && m.quantity < 0) services.add(m.appointmentId);
      }
    }
    for (const r of rowsById.values()) if (r.sold > 0) soldProducts.add(r.productId);
    const rows = [...rowsById.values()]
      .filter(r => Math.abs(r.sold) > 0.005 || r.usedPackages > 0.005 || [...r.used.values()].some(q => Math.abs(q) > 0.005))
      .sort((a, b) => (b.sold + b.usedPackages) - (a.sold + a.usedPackages) || a.name.localeCompare(b.name, 'it'));
    return {
      buckets,
      rows,
      totals: { sold, revenue, usedPackages, usedByUnit, soldProducts: soldProducts.size, services: services.size },
    };
  }, [filtered, mode, from.getTime(), to.getTime(), productById]);

  const listed = kind === 'tutti' ? filtered : filtered.filter(m => movementKind(m) === kind);

  // A sale can be cancelled while some of its lines are still out (net < 0)
  const openSales = useMemo(() => {
    const net = new Map<string, number>();
    for (const m of movements) if (m.saleId) net.set(m.saleId, (net.get(m.saleId) ?? 0) + m.quantity);
    return new Set([...net].filter(([, q]) => q < -0.005).map(([id]) => id));
  }, [movements]);

  const pinProduct = (id: string) => {
    setSearchParams({ prodotto: id });
    setSearchTerm('');
    setVisible(PAGE_SIZE);
  };
  const unpinProduct = () => {
    setSearchParams({});
    setVisible(PAGE_SIZE);
  };

  const handleCancel = (m: StockMovement) => {
    if (!m.saleId) return;
    const msg = pinnedId
      ? "Annullare l'intera vendita (tutti i prodotti dello scontrino)? I prodotti tornano in magazzino."
      : 'Annullare questa vendita? I prodotti tornano in magazzino.';
    if (window.confirm(msg)) cancelSale({ saleId: m.saleId });
  };

  const pinnedByWeight = pinned != null && pinned.unitSize != null && pinned.stockGrams != null;
  const usedValue = pinnedId && pinnedByWeight
    ? (totals.usedByUnit.size ? formatUsed(totals.usedByUnit) : formatQty(0, pinned.unitType ?? 'g'))
    : `${formatNumber(totals.usedPackages)} ${pinnedId ? 'pz' : 'conf.'}`;
  const usedSub = pinnedId && pinnedByWeight
    ? `≈ ${formatNumber(totals.usedPackages)} confezioni · ${totals.services} servizi`
    : `${pinnedId ? '' : 'confezioni equivalenti · '}${totals.services} ${totals.services === 1 ? 'servizio' : 'servizi'}`;
  const hasChartData = buckets.some(b => Math.abs(b.sold) > 0.005 || Math.abs(b.used) > 0.005);

  const shownSaleButtons = new Set<string>();

  return (
    <div className="flex flex-col gap-6 page-enter">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-serif text-on-page">Vendite</h1>
        <button onClick={() => store.openModal('isNewSaleOpen')}
          className="btn-brand flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuova vendita
        </button>
      </div>

      {/* Filters: period first, then product */}
      <div className="flex flex-col gap-3">
        <PeriodPicker period={period} onChange={() => setVisible(PAGE_SIZE)} />

        {pinnedId ? (
          <div className={cn(CARD, "p-4 flex items-center gap-3")}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={pinnedColor
                ? tintTileStyle(pinnedColor)
                : { backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-icon-color)' }}>
              <Package2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-stone-900 uppercase leading-tight break-words">{pinnedName}</p>
              <p className="text-xs text-stone-500">
                {pinned ? <><span className="uppercase">{pinned.brand}</span> · in magazzino {formatStock(pinned)}</> : 'Prodotto non più in magazzino'}
              </p>
            </div>
            <button onClick={unpinProduct} aria-label="Tutti i prodotti"
              className="shrink-0 flex items-center gap-1 text-xs font-medium text-stone-600 bg-stone-50 border border-stone-200 rounded-full p-2 sm:pl-2 sm:pr-3 sm:py-1.5 hover:bg-stone-100">
              <X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Tutti i prodotti</span>
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cerca prodotto o marca..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setVisible(PAGE_SIZE); }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="w-full bg-white border border-stone-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-brand-dark focus:ring-1 focus:ring-brand-dark transition-all shadow-sm"
            />
            {searchFocused && suggestions.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
                <p className="px-4 pt-2 pb-1 text-[0.625rem] uppercase tracking-[0.15em] text-stone-400">Vedi solo il prodotto</p>
                {suggestions.map(p => (
                  <button key={p.id} type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => pinProduct(p.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex flex-col">
                    <span className="text-sm font-medium text-stone-900 uppercase leading-tight">{p.name}</span>
                    <span className="text-xs text-stone-500 uppercase"><BrandDot brand={p.brand} />{p.brand}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-on-page-muted" /></div>
      ) : isError ? (
        <div className="py-12 flex flex-col items-center justify-center text-red-500 gap-2">
          <AlertCircle className="w-8 h-8 opacity-70" />
          <p className="text-sm">Errore nel caricamento delle vendite.</p>
        </div>
      ) : (
        <div className={cn("flex flex-col gap-6 transition-opacity", isFetching && "opacity-70")}>
          <section className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <KpiTile icon={<ShoppingBag className="w-4 h-4" />} label="Venduti"
              value={`${formatNumber(totals.sold)} pz`}
              sub={pinnedId ? undefined : `${totals.soldProducts} ${totals.soldProducts === 1 ? 'prodotto' : 'prodotti diversi'}`} />
            <KpiTile icon={<Receipt className="w-4 h-4" />} label="Incasso prodotti"
              value={formatEuro(totals.revenue)} />
            <KpiTile icon={<Scissors className="w-4 h-4" />} label="Usati nei servizi"
              value={usedValue} sub={usedSub} className="col-span-2 md:col-span-1" />
          </section>

          {buckets.length > 0 && (
            <section className={cn(CARD, "p-4 md:p-5")}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-medium text-stone-900">Andamento</h2>
                <div className="flex items-center gap-4 text-xs text-stone-600">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SERIES_SOLD }} />Venduti (pz)</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: SERIES_USED }} />Usati nei servizi (conf.)</span>
                </div>
              </div>
              {hasChartData ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={buckets} barGap={2} barCategoryGap="18%" margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#EFEBE3" />
                      <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: '#E3DED3' }}
                        tick={{ fontSize: 11 * fontScale, fill: '#8A8578' }} interval="preserveStartEnd" minTickGap={6} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 * fontScale, fill: '#8A8578' }}
                        allowDecimals={false} domain={[0, (max: number) => Math.max(1, Math.ceil(max))]}
                        tickFormatter={v => formatNumber(Number(v))} width={44 * fontScale} />
                      <Tooltip cursor={{ fill: 'rgba(32,48,79,0.05)' }}
                        content={<ChartTooltip unitNote={pinnedId && !pinnedByWeight ? 'pz' : 'conf.'} />} />
                      <Bar dataKey="sold" name="Venduti" fill={SERIES_SOLD} radius={[4, 4, 0, 0]} maxBarSize={24}
                        activeBar={{ fillOpacity: 0.8 }} />
                      <Bar dataKey="used" name="Usati nei servizi" fill={SERIES_USED} radius={[4, 4, 0, 0]} maxBarSize={24}
                        activeBar={{ fillOpacity: 0.8 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-stone-400">Nessuna vendita o utilizzo nel periodo.</p>
              )}
            </section>
          )}

          {!pinnedId && (
            <section className={cn(CARD, "overflow-hidden")}>
              <div className="px-4 md:px-5 py-3 border-b border-stone-100 hidden md:grid grid-cols-[1fr_5.625rem_6.875rem_9.375rem] gap-3 text-[0.6875rem] uppercase tracking-[0.12em] font-semibold text-stone-500">
                <span>Prodotto</span><span className="text-right">Venduti</span><span className="text-right">Incasso</span><span className="text-right">Usati nei servizi</span>
              </div>
              <h2 className="md:hidden px-4 pt-3 pb-1 text-sm font-medium text-stone-900">Per prodotto</h2>
              {rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-stone-400">Nessun prodotto venduto o usato nel periodo.</p>
              ) : rows.map(r => (
                <button key={r.productId} onClick={() => pinProduct(r.productId)}
                  className="w-full text-left px-4 md:px-5 py-3 border-b border-stone-50 last:border-b-0 hover:bg-stone-50 transition-colors grid grid-cols-3 md:grid-cols-[1fr_5.625rem_6.875rem_9.375rem] gap-x-3 gap-y-1 items-center">
                  <span className="col-span-3 md:col-span-1 min-w-0">
                    <span className="block text-sm font-medium text-stone-900 uppercase leading-tight break-words">{r.name}</span>
                    <span className="block text-xs text-stone-500 uppercase"><BrandDot brand={r.brand} />{r.brand}</span>
                  </span>
                  <span className="text-sm text-stone-900 md:text-right tabular-nums">
                    <span className="md:hidden text-xs text-stone-400">Venduti </span>{r.sold ? `${formatNumber(r.sold)} pz` : '—'}
                  </span>
                  <span className="text-sm text-stone-900 md:text-right tabular-nums">
                    <span className="md:hidden text-xs text-stone-400">Incasso </span>{r.revenue ? formatEuro(r.revenue) : '—'}
                  </span>
                  <span className="text-sm text-stone-900 md:text-right tabular-nums">
                    <span className="md:hidden text-xs text-stone-400">Usati </span>{formatUsed(r.used)}
                    {[...r.used.keys()].some(u => u !== 'pz') && r.usedPackages > 0.05 && (
                      <span className="block text-xs text-stone-400">≈ {formatNumber(r.usedPackages)} conf.</span>
                    )}
                  </span>
                </button>
              ))}
            </section>
          )}

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-serif text-on-page">Movimenti</h2>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {KINDS.map(k => (
                <button key={k.value} onClick={() => { setKind(k.value); setVisible(PAGE_SIZE); }}
                  className={cn(CHIP, kind === k.value ? CHIP_ON : CHIP_OFF)}>
                  {k.label}
                </button>
              ))}
            </div>
            <div className={cn(CARD, "overflow-hidden")}>
              {listed.length === 0 ? (
                <p className="py-8 text-center text-sm text-stone-400">Nessun movimento nel periodo.</p>
              ) : listed.slice(0, visible).map(m => {
                const product = productById.get(m.productId);
                const packages = m.unit !== 'pz' ? toPackages(Math.abs(m.quantity), m.unit, product) : null;
                const canCancel = m.saleId != null && m.quantity < 0 && openSales.has(m.saleId) && !shownSaleButtons.has(m.saleId);
                if (canCancel) shownSaleButtons.add(m.saleId!);
                const details = [m.clientName, m.note, m.userName].filter(Boolean).join(' · ');
                return (
                  <div key={m.id} className="px-4 md:px-5 py-3 border-b border-stone-50 last:border-b-0 flex gap-3">
                    <div className="w-12 shrink-0 text-xs text-stone-500 leading-tight pt-0.5">
                      <div className="font-medium text-stone-700">{format(parseISO(m.date), 'dd/MM')}</div>
                      <div>{m.time}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      {!pinnedId && (
                        <p className="text-sm font-medium text-stone-900 uppercase leading-tight break-words">
                          <BrandDot brand={product?.brand ?? m.productBrand} />{product?.name ?? m.productName}
                        </p>
                      )}
                      <p className={cn("text-sm", pinnedId ? "font-medium text-stone-900" : "text-stone-600")}>{movementLabel(m)}</p>
                      {details && <p className="text-xs text-stone-500 break-words">{details}</p>}
                      {canCancel && (
                        <button onClick={() => handleCancel(m)} disabled={isCancelling}
                          className="mt-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
                          Annulla vendita
                        </button>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-stone-900 tabular-nums">{formatSignedQty(m.quantity, m.unit)}</p>
                      {packages != null && <p className="text-xs text-stone-400 tabular-nums">≈ {formatNumber(packages)} conf.</p>}
                      {m.reason === 'vendita' && m.unitPrice != null && (
                        <p className="text-xs text-stone-500 tabular-nums">{formatEuro(Math.abs(m.quantity) * m.unitPrice)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {listed.length > visible && (
              <button onClick={() => setVisible(v => v + PAGE_SIZE)}
                className="self-center text-sm font-medium text-stone-600 bg-white border border-stone-200 rounded-full px-5 py-2 hover:bg-stone-50">
                Mostra altri ({listed.length - visible})
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  );
};
