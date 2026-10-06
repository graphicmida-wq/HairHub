import React, { useId, useMemo, useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { useListProducts } from '@workspace/api-client-react';
import { cn, compareText } from '../lib/utils';
import { useCatalog } from '../lib/catalog';

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Optional sub-categories of a product, picked like tags. The chips offered are
 * the ones of the same brand and category (used by products or added in
 * Impostazioni → Marche e categorie); a new one can be typed, with the names
 * used for that category in other brands as suggestions.
 */
export const SubcategoryInput = ({ brand, category, value, onChange }: {
  brand: string;
  category: string;
  value: string[];
  onChange: (value: string[]) => void;
}) => {
  const { data: products = [] } = useListProducts();
  const { subcategories: listed } = useCatalog();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const listId = useId();

  const { own, others } = useMemo(() => {
    const own = new Map<string, string>();
    const others = new Map<string, string>();
    const offer = (entryBrand: string, entryCategory: string, names: string[]) => {
      if (!category.trim() || norm(entryCategory) !== norm(category)) return;
      const target = norm(entryBrand) === norm(brand) ? own : others;
      for (const s of names) {
        if (!target.has(norm(s))) target.set(norm(s), s.trim());
      }
    };
    for (const p of products) offer(p.brand, p.category, p.subcategories ?? []);
    for (const e of listed) offer(e.brand, e.category, [e.name]);
    return { own, others };
  }, [products, listed, brand, category]);

  const selected = new Set(value.map(norm));
  const chips = [...own.values(), ...value.filter(v => !own.has(norm(v)))].sort(compareText);
  const suggestions = [...others.entries()]
    .filter(([key]) => !own.has(key) && !selected.has(key))
    .map(([, name]) => name)
    .sort(compareText);

  const toggle = (chip: string) => {
    onChange(selected.has(norm(chip)) ? value.filter(v => norm(v) !== norm(chip)) : [...value, chip]);
  };

  const confirmDraft = () => {
    const text = draft.trim();
    if (text && !selected.has(norm(text))) onChange([...value, others.get(norm(text)) ?? text]);
    setDraft('');
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-stone-700">
        Sottocategorie <span className="font-normal text-stone-400">(facoltative)</span>
      </label>
      {!category.trim() ? (
        <p className="text-xs text-stone-400">Scegli prima la categoria.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {chips.map(chip => {
              const on = selected.has(norm(chip));
              return (
                <button
                  key={norm(chip)}
                  type="button"
                  onClick={() => toggle(chip)}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95',
                    on ? 'btn-brand text-white border-transparent' : 'bg-white text-stone-600 border-stone-200 hover:border-brand-dark/30'
                  )}
                >
                  {on && <Check className="w-3.5 h-3.5" />}
                  {chip}
                </button>
              );
            })}
            {adding ? (
              <span className="flex items-center gap-1">
                <input
                  autoFocus
                  list={listId}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent) => {
                    // Enter adds the tag instead of submitting the product form
                    if (e.key === 'Enter') { e.preventDefault(); confirmDraft(); }
                    if (e.key === 'Escape') { setDraft(''); setAdding(false); }
                  }}
                  placeholder="Nuova sottocategoria"
                  className="w-44 bg-white border border-stone-200 rounded-full px-3 py-1.5 text-sm outline-none focus:border-brand-dark"
                />
                <button type="button" onClick={confirmDraft} aria-label="Aggiungi"
                  className="w-7 h-7 rounded-full btn-brand text-white flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => { setDraft(''); setAdding(false); }} aria-label="Annulla"
                  className="w-7 h-7 rounded-full text-stone-400 hover:text-stone-700 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-stone-300 text-stone-500 hover:text-stone-800 hover:border-stone-400"
              >
                <Plus className="w-3.5 h-3.5" /> Nuova
              </button>
            )}
          </div>
          <datalist id={listId}>
            {suggestions.map(s => <option key={s} value={s} />)}
          </datalist>
          {chips.length === 0 && !adding && (
            <p className="text-xs text-stone-400">
              Nessuna sottocategoria per {category.trim()}{brand.trim() ? <> di <span className="uppercase">{brand.trim()}</span></> : null}: creane una con "Nuova".
            </p>
          )}
        </>
      )}
    </div>
  );
};
