import React, { useState, useEffect, useRef } from 'react';
import { useListProducts, useListServices } from '@workspace/api-client-react';
import { Plus, X, ChevronDown, Check } from 'lucide-react';
import { mergeNames, useCatalog } from '../lib/catalog';

interface CategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  source?: 'products' | 'services';
}

interface CategoryInputCoreProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  /** The salon's list (Impostazioni → Marche e categorie) */
  categories: string[];
}

const CategoryInputCore = ({ value, onChange, required, categories }: CategoryInputCoreProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  // Typed with "Nuova categoria…": listed here until the product is saved, then it is in the salon's list
  const [sessionCategories, setSessionCategories] = useState<string[]>([]);
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

  // The current value stays offered even if it was renamed or removed meanwhile
  const allCategories = mergeNames(categories, sessionCategories, value ? [value] : []);

  const handleSelect = (cat: string) => {
    onChange(cat);
    setIsOpen(false);
    setAddingNew(false);
    setNewCategory('');
  };

  const confirmNew = () => {
    const typed = newCategory.trim().replace(/\s+/g, ' ');
    if (!typed) return;
    // Typing a category that already exists picks it, with its own spelling
    const existing = allCategories.find(c => c.toLowerCase() === typed.toLowerCase());
    const chosen = existing ?? typed;
    if (!existing) setSessionCategories(prev => [...prev, chosen]);
    onChange(chosen);
    setAddingNew(false);
    setNewCategory('');
    setIsOpen(false);
  };

  const displayValue = value || 'Seleziona categoria';
  const hasValue = !!value;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden input for native required/form validation */}
      <input
        type="text"
        required={required}
        value={value}
        onChange={() => { /* controlled by dropdown */ }}
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />

      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setIsOpen(o => !o); setAddingNew(false); setNewCategory(''); }}
        className="w-full flex items-center justify-between bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors text-left"
        style={{ borderColor: isOpen ? 'var(--color-brand-dark)' : undefined, color: hasValue ? 'var(--color-stone-900)' : 'var(--color-placeholder)' }}
      >
        <span className="truncate">{displayValue}</span>
        <ChevronDown
          className="w-4 h-4 shrink-0 ml-2 transition-transform"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: 'var(--color-brand-muted)' }}
        />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden"
          style={{ maxHeight: '13.75rem', overflowY: 'auto' }}
        >
          {allCategories.length === 0 && !addingNew && (
            <div className="px-4 py-3 text-xs text-stone-400 italic">Nessuna categoria disponibile</div>
          )}

          {allCategories.map(cat => (
            <div
              key={cat}
              className="flex items-center px-3 py-2.5 cursor-pointer transition-colors hover:bg-stone-50"
              onClick={() => handleSelect(cat)}
            >
              <Check
                className="w-3.5 h-3.5 mr-2.5 shrink-0 transition-opacity"
                style={{ color: 'var(--color-brand-dark)', opacity: value === cat ? 1 : 0 }}
              />
              <span className="flex-1 text-sm text-stone-800 truncate">{cat}</span>
            </div>
          ))}

          {/* Add new inline */}
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
                className="btn-brand p-1.5 rounded-lg text-white disabled:opacity-40"
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
              style={{ color: 'var(--color-brand-primary)' }}
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

// The salon's list, plus any category still found on products/services (while the list loads)
const CategoryInputProducts = (props: Omit<CategoryInputCoreProps, 'categories'>) => {
  const { productCategories } = useCatalog();
  const { data: products = [] } = useListProducts();
  return <CategoryInputCore {...props} categories={mergeNames(productCategories.map(c => c.name), products.map(p => p.category))} />;
};

const CategoryInputServices = (props: Omit<CategoryInputCoreProps, 'categories'>) => {
  const { serviceCategories } = useCatalog();
  const { data: services = [] } = useListServices();
  return <CategoryInputCore {...props} categories={mergeNames(serviceCategories.map(c => c.name), services.map(s => s.category))} />;
};

export const CategoryInput = ({ source = 'products', ...rest }: CategoryInputProps) => {
  if (source === 'services') return <CategoryInputServices {...rest} />;
  return <CategoryInputProducts {...rest} />;
};
