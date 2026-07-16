import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useListProducts } from '@workspace/api-client-react';
import { Plus, Check } from 'lucide-react';

interface BrandInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

/**
 * Free-text brand field with tag-style suggestions: existing brands (derived
 * from products, deduplicated ignoring case/spaces) are offered while typing;
 * picking one reuses its exact spelling so products group together.
 */
export const BrandInput = ({ value, onChange, required }: BrandInputProps) => {
  const { data: products = [] } = useListProducts();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Unique brands, case-insensitive; the most frequent spelling wins
  const brands = useMemo(() => {
    const variants = new Map<string, Map<string, number>>();
    for (const p of products) {
      const raw = (p.brand ?? '').trim();
      if (!raw) continue;
      const key = raw.toLowerCase();
      const counts = variants.get(key) ?? new Map<string, number>();
      counts.set(raw, (counts.get(raw) ?? 0) + 1);
      variants.set(key, counts);
    }
    return Array.from(variants.values(), counts => {
      let best = '';
      let bestCount = -1;
      for (const [spelling, count] of counts) {
        if (count > bestCount) { best = spelling; bestCount = count; }
      }
      return best;
    }).sort((a, b) => a.localeCompare(b, 'it'));
  }, [products]);

  const query = value.trim().toLowerCase();
  const suggestions = query ? brands.filter(b => b.toLowerCase().includes(query)) : brands;
  const exactMatch = brands.find(b => b.toLowerCase() === query);
  const isNew = !!query && !exactMatch;

  const handleSelect = (brand: string) => {
    onChange(brand);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        required={required}
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') setIsOpen(false);
          if (e.key === 'Enter' && isOpen) {
            e.preventDefault();
            if (!exactMatch && suggestions.length > 0 && query) {
              onChange(suggestions[0]);
            } else if (exactMatch) {
              onChange(exactMatch);
            }
            setIsOpen(false);
          }
        }}
        autoComplete="off"
        className="bg-white border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full text-sm uppercase placeholder:normal-case"
      />

      {isOpen && (suggestions.length > 0 || isNew) && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden"
          style={{ maxHeight: '200px', overflowY: 'auto' }}
        >
          {suggestions.map(brand => (
            <div
              key={brand}
              className="flex items-center px-3 py-2.5 cursor-pointer transition-colors hover:bg-stone-50"
              onMouseDown={e => { e.preventDefault(); handleSelect(brand); }}
            >
              <Check
                className="w-3.5 h-3.5 mr-2.5 shrink-0"
                style={{ color: 'var(--color-brand-dark)', opacity: exactMatch === brand ? 1 : 0 }}
              />
              <span className="flex-1 text-sm text-stone-800 truncate uppercase">{brand}</span>
            </div>
          ))}
          {isNew && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-sm border-t border-stone-100 transition-colors hover:bg-stone-50"
              style={{ color: 'var(--color-brand-primary)' }}
              onMouseDown={e => { e.preventDefault(); handleSelect(value.trim()); }}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Nuova marca:</span>
              <span className="uppercase font-medium truncate">{value.trim()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
