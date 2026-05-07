import React, { useState, useEffect, useRef } from 'react';
import { useListProducts } from '@workspace/api-client-react';
import { Plus, X, ChevronDown, Check } from 'lucide-react';

const BUILTIN_CATEGORIES = ['Lavaggio', 'Colore', 'Finish', 'Trattamento', 'Styling', 'Altro'];
const LS_KEY = 'hirhub_suppressed_categories';

const loadSuppressed = (): string[] => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
};
const saveSuppressed = (list: string[]) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch { /* noop */ }
};

interface CategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const CategoryInput = ({ value, onChange }: CategoryInputProps) => {
  const { data: products = [] } = useListProducts();
  const [isOpen, setIsOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [sessionCategories, setSessionCategories] = useState<string[]>([]);
  const [suppressed, setSuppressed] = useState<string[]>(loadSuppressed);
  const containerRef = useRef<HTMLDivElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setAddingNew(false);
        setNewCategory('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (addingNew && newInputRef.current) newInputRef.current.focus();
  }, [addingNew]);

  const existingFromProducts = Array.from(
    new Set(products.map(p => p.category).filter(Boolean))
  );

  const allCategories = Array.from(
    new Set([...BUILTIN_CATEGORIES, ...existingFromProducts, ...sessionCategories])
  )
    .filter(cat => !suppressed.includes(cat))
    .sort((a, b) => a.localeCompare(b, 'it'));

  const isBuiltin = (cat: string) => BUILTIN_CATEGORIES.includes(cat);

  const handleDelete = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isBuiltin(cat)) return;
    // remove from session if it's a session category
    if (sessionCategories.includes(cat)) {
      setSessionCategories(prev => prev.filter(c => c !== cat));
    }
    // suppress (persisted) for product-derived categories
    const next = [...suppressed, cat];
    setSuppressed(next);
    saveSuppressed(next);
    // clear value if it was the selected one
    if (value === cat) onChange('');
  };

  const handleSelect = (cat: string) => {
    onChange(cat);
    setIsOpen(false);
    setAddingNew(false);
    setNewCategory('');
  };

  const confirmNew = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    // un-suppress if previously suppressed
    if (suppressed.includes(trimmed)) {
      const next = suppressed.filter(s => s !== trimmed);
      setSuppressed(next);
      saveSuppressed(next);
    }
    if (!allCategories.includes(trimmed) && !sessionCategories.includes(trimmed)) {
      setSessionCategories(prev => [...prev, trimmed]);
    }
    onChange(trimmed);
    setAddingNew(false);
    setNewCategory('');
    setIsOpen(false);
  };

  const displayValue = value || 'Seleziona categoria';
  const hasValue = !!value;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setIsOpen(o => !o); setAddingNew(false); setNewCategory(''); }}
        className="w-full flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors text-left"
        style={{ borderColor: isOpen ? '#3A3748' : undefined, color: hasValue ? '#1c1917' : '#9ca3af' }}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown
          className="w-4 h-4 shrink-0 ml-2 transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: '#9B98A8' }}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden"
          style={{ maxHeight: '220px', overflowY: 'auto' }}
        >
          {allCategories.length === 0 && !addingNew && (
            <div className="px-4 py-3 text-xs text-stone-400 italic">Nessuna categoria disponibile</div>
          )}

          {allCategories.map(cat => (
            <div
              key={cat}
              className="flex items-center group px-3 py-2.5 cursor-pointer transition-colors hover:bg-stone-50"
              onClick={() => handleSelect(cat)}
            >
              <Check
                className="w-3.5 h-3.5 mr-2.5 shrink-0 transition-opacity"
                style={{ color: '#3A3748', opacity: value === cat ? 1 : 0 }}
              />
              <span className="flex-1 text-sm text-stone-800 truncate">{cat}</span>
              {!isBuiltin(cat) && (
                <button
                  type="button"
                  onClick={(e) => handleDelete(cat, e)}
                  className="ml-2 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500 text-stone-400 shrink-0"
                  title="Rimuovi categoria"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {/* Add new row */}
          {addingNew ? (
            <div className="flex items-center gap-2 px-3 py-2 border-t border-stone-100">
              <input
                ref={newInputRef}
                type="text"
                placeholder="Nome nuova categoria..."
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); confirmNew(); }
                  if (e.key === 'Escape') { setAddingNew(false); setNewCategory(''); }
                }}
                className="flex-1 text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 outline-none focus:border-brand-dark transition-colors"
              />
              <button
                type="button"
                onClick={confirmNew}
                disabled={!newCategory.trim()}
                className="p-1.5 rounded-lg text-white transition-colors disabled:opacity-40"
                style={{ backgroundColor: '#3A3748' }}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => { setAddingNew(false); setNewCategory(''); }}
                className="p-1.5 rounded-lg bg-stone-100 text-stone-500 transition-colors hover:bg-stone-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingNew(true)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm border-t border-stone-100 transition-colors hover:bg-stone-50"
              style={{ color: '#5C5870' }}
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              Nuova categoria...
            </button>
          )}
        </div>
      )}
    </div>
  );
};
