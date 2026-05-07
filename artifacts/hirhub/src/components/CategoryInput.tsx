import React, { useState } from 'react';
import { useListProducts } from '@workspace/api-client-react';
import { Plus, X } from 'lucide-react';

const INPUT_CLASS = "bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:border-brand-dark transition-colors w-full text-sm";

const BUILTIN_CATEGORIES = ['Lavaggio', 'Colore', 'Finish', 'Trattamento', 'Styling', 'Altro'];

interface CategoryInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const CategoryInput = ({ value, onChange, required }: CategoryInputProps) => {
  const { data: products = [] } = useListProducts();
  const [addingNew, setAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  // custom categories created during this session (not yet saved in any product)
  const [sessionCategories, setSessionCategories] = useState<string[]>([]);

  const existingFromProducts = Array.from(
    new Set(products.map(p => p.category).filter(Boolean))
  );

  const allCategories = Array.from(
    new Set([...BUILTIN_CATEGORIES, ...existingFromProducts, ...sessionCategories])
  ).sort((a, b) => a.localeCompare(b, 'it'));

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__new__') {
      setAddingNew(true);
      setNewCategory('');
    } else {
      onChange(val);
    }
  };

  const confirmNew = () => {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    // add to session list so it stays visible in the dropdown
    if (!allCategories.includes(trimmed)) {
      setSessionCategories(prev => [...prev, trimmed]);
    }
    onChange(trimmed);
    setAddingNew(false);
    setNewCategory('');
  };

  const cancelNew = () => {
    setAddingNew(false);
    setNewCategory('');
  };

  if (addingNew) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          type="text"
          placeholder="Nome nuova categoria..."
          value={newCategory}
          onChange={e => setNewCategory(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); confirmNew(); }
            if (e.key === 'Escape') cancelNew();
          }}
          className={INPUT_CLASS + ' flex-1'}
        />
        <button
          type="button"
          onClick={confirmNew}
          disabled={!newCategory.trim()}
          className="px-3 py-2 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-40"
          style={{ backgroundColor: '#3A3748' }}
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={cancelNew}
          className="px-3 py-2 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium transition-colors hover:bg-stone-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <select
      required={required}
      value={value}
      onChange={handleSelectChange}
      className={INPUT_CLASS}
    >
      <option value="" disabled>Seleziona categoria</option>
      {allCategories.map(cat => (
        <option key={cat} value={cat}>{cat}</option>
      ))}
      <option value="__new__">＋ Nuova categoria...</option>
    </select>
  );
};
