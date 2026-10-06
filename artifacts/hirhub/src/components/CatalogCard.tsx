import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Tags, Search, Plus, Pencil, Trash2, Check, X, Palette } from 'lucide-react';
import {
  getGetCatalogQueryKey, getListBrandColorsQueryKey, getListProductsQueryKey, getListServicesQueryKey,
  getListStockMovementsQueryKey, useAddCatalogTag, useDeleteCatalogTag, useRenameCatalogTag,
  type Catalog, type CatalogEntry, type CatalogKind,
} from '@workspace/api-client-react';
import { cn } from '../lib/utils';
import { toast } from './Toast';
import { invalidateCatalog, useCatalog } from '../lib/catalog';
import { BrandColorPicker, useSaveBrandColor } from '../lib/product-brand-colors';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const TABS: { kind: CatalogKind; label: string; list: keyof Catalog; placeholder: string }[] = [
  { kind: 'brand', label: 'Marche', list: 'brands', placeholder: 'Cerca o aggiungi una marca…' },
  { kind: 'product_category', label: 'Categorie prodotti', list: 'productCategories', placeholder: 'Cerca o aggiungi una categoria…' },
  { kind: 'service_category', label: 'Categorie servizi', list: 'serviceCategories', placeholder: 'Cerca o aggiungi una categoria…' },
];

const usage = (kind: CatalogKind, n: number) => {
  const [one, many, none] = kind === 'service_category'
    ? ['servizio', 'servizi', 'nessun servizio']
    : ['prodotto', 'prodotti', 'nessun prodotto'];
  return n === 0 ? none : `${n} ${n === 1 ? one : many}`;
};

const errorMessage = (err: unknown, fallback: string) =>
  (err as { data?: { message?: string } })?.data?.message ?? fallback;

/**
 * Impostazioni → Marche e categorie: the list product and service forms pick
 * from. Renaming or deleting rewrites the products/services that use an entry;
 * new entries can still be typed on the fly in the forms.
 */
export const CatalogCard = () => {
  const queryClient = useQueryClient();
  const catalog = useCatalog();
  const [tabIndex, setTabIndex] = useState(0);
  const tab = TABS[tabIndex]!;
  const entries = catalog[tab.list];
  const [query, setQuery] = useState('');
  const [renaming, setRenaming] = useState<{ name: string; value: string } | null>(null);
  const [deleting, setDeleting] = useState<{ name: string; moveTo: string } | null>(null);
  const [colorFor, setColorFor] = useState<string | null>(null);

  // Products, services and the movement history change with a rename or a move
  const onChanged = (data: Catalog) => {
    queryClient.setQueryData(getGetCatalogQueryKey(), data);
    queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListServicesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListStockMovementsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListBrandColorsQueryKey() });
  };
  const { mutate: addTag, isPending: adding } = useAddCatalogTag({
    mutation: {
      onSuccess: data => { onChanged(data); setQuery(''); toast.show('Aggiunta all\'elenco'); },
      onError: err => toast.show(errorMessage(err, 'Aggiunta non riuscita'), 'error'),
    },
  });
  const { mutate: renameTag, isPending: renamingNow } = useRenameCatalogTag({
    mutation: {
      onSuccess: data => { onChanged(data); setRenaming(null); toast.show('Nome aggiornato'); },
      onError: err => toast.show(errorMessage(err, 'Modifica non riuscita'), 'error'),
    },
  });
  const { mutate: deleteTag, isPending: deletingNow } = useDeleteCatalogTag({
    mutation: {
      onSuccess: data => { onChanged(data); setDeleting(null); toast.show('Eliminata dall\'elenco'); },
      onError: err => toast.show(errorMessage(err, 'Eliminazione non riuscita'), 'error'),
    },
  });
  const { mutate: saveColor } = useSaveBrandColor();
  const busy = adding || renamingNow || deletingNow;

  const typed = query.trim().replace(/\s+/g, ' ');
  const exact = entries.find(e => e.name.toLowerCase() === typed.toLowerCase());
  const shown = typed ? entries.filter(e => e.name.toLowerCase().includes(typed.toLowerCase())) : entries;
  const isBrand = tab.kind === 'brand';

  const chooseTab = (i: number) => {
    setTabIndex(i);
    setQuery('');
    setRenaming(null);
    setDeleting(null);
  };

  const add = () => {
    if (!typed || exact) return;
    addTag({ data: { kind: tab.kind, name: typed } });
  };

  const submitRename = () => {
    if (!renaming) return;
    const to = renaming.value.trim().replace(/\s+/g, ' ');
    if (!to || to === renaming.name) { setRenaming(null); return; }
    const from = entries.find(e => e.name === renaming.name);
    // Renaming to another entry merges the two: ask first
    const other = entries.find(e => e.name.toLowerCase() === to.toLowerCase() && e.name.toLowerCase() !== renaming.name.toLowerCase());
    if (other && !window.confirm(
      `«${other.name}» c'è già: unire le due voci?\n\n`
      + `${from && from.count > 0 ? `${usage(tab.kind, from.count)} di «${renaming.name}» passano a «${other.name}», ` : ''}`
      + `«${renaming.name}» sparisce dall'elenco.`,
    )) return;
    renameTag({ data: { kind: tab.kind, from: renaming.name, to: other ? other.name : to } });
  };

  const askDelete = (e: CatalogEntry) => {
    setRenaming(null);
    if (e.count === 0) {
      if (window.confirm(`Eliminare «${e.name}» dall'elenco?`)) deleteTag({ data: { kind: tab.kind, name: e.name } });
      return;
    }
    setDeleting({ name: e.name, moveTo: '' });
  };

  const changeColor = (brand: string, color: string | null) => {
    saveColor(
      { data: { brand, color } },
      {
        onSuccess: () => invalidateCatalog(queryClient),
        onError: () => toast.show('Errore nel salvataggio del colore', 'error'),
      },
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Tags className="w-4 h-4 text-stone-400" />
          <h2 className="text-base font-semibold text-stone-900">Marche e categorie</h2>
        </div>
        <p className="text-sm text-stone-500 mt-0.5">
          L'elenco da cui si scelgono marca e categoria di prodotti e servizi. Si possono anche creare al volo dal prodotto o dal servizio.
        </p>
      </div>

      <div className="p-6 flex flex-col gap-4">
        <div role="tablist" className="flex flex-wrap gap-2">
          {TABS.map((t, i) => (
            <button
              key={t.kind}
              type="button"
              role="tab"
              aria-selected={i === tabIndex}
              onClick={() => chooseTab(i)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium border transition-all',
                i === tabIndex ? 'btn-brand text-white border-transparent' : 'bg-white text-stone-600 border-stone-200 hover:border-brand-dark/30',
              )}
            >
              {t.label} <span className={cn('ml-1 tabular-nums', i === tabIndex ? 'opacity-80' : 'text-stone-400')}>{catalog[t.list].length}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
              placeholder={tab.placeholder}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-brand-dark transition-colors"
            />
          </div>
          {typed && !exact && (
            <button
              type="button"
              onClick={add}
              disabled={busy}
              className="btn-brand flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">Aggiungi «{typed}»</span>
            </button>
          )}
        </div>

        {/* key: each tab's list starts from the top */}
        <div key={tab.kind} className="border border-stone-100 rounded-xl divide-y divide-stone-100 max-h-[28rem] overflow-y-auto">
          {shown.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-stone-400">
              {typed ? 'Nessuna voce trovata.' : 'L\'elenco è vuoto.'}
            </p>
          )}
          {shown.map(e => {
            const isRenaming = renaming?.name === e.name;
            const isDeleting = deleting?.name === e.name;
            return (
              <div key={e.name} className="px-4 py-3 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  {isBrand && (
                    <Popover open={colorFor === e.name} onOpenChange={open => setColorFor(open ? e.name : null)}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Colore di ${e.name}`}
                          className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center shrink-0"
                          style={e.color ? { backgroundColor: e.color, borderColor: 'transparent' } : undefined}
                        >
                          {!e.color && <Palette className="w-3.5 h-3.5 text-stone-400" />}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-72 rounded-2xl">
                        <p className="text-sm font-medium text-stone-900 mb-3">Colore di <span className="uppercase">{e.name}</span></p>
                        <BrandColorPicker value={e.color ?? null} onChange={color => changeColor(e.name, color)} />
                      </PopoverContent>
                    </Popover>
                  )}

                  {isRenaming ? (
                    <form className="flex-1 flex items-center gap-2 min-w-0" onSubmit={ev => { ev.preventDefault(); submitRename(); }}>
                      <input
                        autoFocus
                        type="text"
                        value={renaming.value}
                        onChange={ev => setRenaming({ name: e.name, value: ev.target.value })}
                        onKeyDown={ev => { if (ev.key === 'Escape') setRenaming(null); }}
                        className="flex-1 min-w-0 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-dark"
                        aria-label="Nuovo nome"
                      />
                      <button type="submit" disabled={busy} aria-label="Salva nome"
                        className="btn-brand p-2 rounded-lg text-white disabled:opacity-60 shrink-0">
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setRenaming(null)} aria-label="Annulla"
                        className="p-2 rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium text-stone-900 break-words', isBrand && 'uppercase')}>{e.name}</p>
                        <p className="text-xs text-stone-500">{usage(tab.kind, e.count)}</p>
                      </div>
                      <button type="button" onClick={() => { setDeleting(null); setRenaming({ name: e.name, value: e.name }); }}
                        aria-label={`Rinomina ${e.name}`} title="Rinomina"
                        className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 shrink-0">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => askDelete(e)} disabled={busy}
                        aria-label={`Elimina ${e.name}`} title="Elimina"
                        className="p-2 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 shrink-0 disabled:opacity-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {isDeleting && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex flex-col gap-3">
                    <p className="text-sm text-stone-700">
                      {usage(tab.kind, e.count)} {e.count === 1 ? 'usa' : 'usano'} «{e.name}». Prima di eliminarla, scegli dove spostarli:
                    </p>
                    <select
                      value={deleting.moveTo}
                      onChange={ev => setDeleting({ name: e.name, moveTo: ev.target.value })}
                      className="bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-brand-dark"
                      aria-label="Sposta in"
                    >
                      <option value="">Scegli…</option>
                      {entries.filter(o => o.name !== e.name).map(o => (
                        <option key={o.name} value={o.name}>{isBrand ? o.name.toUpperCase() : o.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setDeleting(null)} disabled={busy}
                        className="flex-1 bg-white border border-stone-200 text-stone-700 font-medium py-2.5 rounded-xl text-sm hover:bg-stone-50">
                        Annulla
                      </button>
                      <button type="button" disabled={busy || !deleting.moveTo}
                        onClick={() => deleteTag({ data: { kind: tab.kind, name: e.name, moveTo: deleting.moveTo } })}
                        className="flex-1 bg-red-600 text-white font-medium py-2.5 rounded-xl text-sm hover:bg-red-700 disabled:opacity-50">
                        Sposta ed elimina
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
