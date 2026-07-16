import React, { useState } from 'react';
import { store } from '../lib/store';
import { useListProducts, type Product } from '@workspace/api-client-react';
import { Box, Search, AlertCircle, Plus, Loader2, Tag, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { EditProductModal } from '../components/EditProductModal';

function isLowStock(product: Product): boolean {
  if (product.unitSize != null && product.stockGrams != null) {
    // Low stock based on grams: remaining < minThreshold * unitSize
    return product.stockGrams < product.minThreshold * product.unitSize;
  }
  return product.quantity <= product.minThreshold;
}

function getDisplayQuantity(product: Product): number {
  if (product.unitSize != null && product.stockGrams != null && product.unitSize > 0) {
    return Math.max(0, Math.floor(product.stockGrams / product.unitSize));
  }
  return product.quantity;
}

function formatStock(product: Product): React.ReactNode {
  if (product.unitSize != null && product.stockGrams != null) {
    const unit = product.unitType ?? 'g';
    const low = isLowStock(product);
    const quantity = getDisplayQuantity(product);
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className={cn("text-lg font-medium", low ? "text-red-600" : "text-stone-900")}>
          {product.stockGrams % 1 === 0 ? product.stockGrams : product.stockGrams.toFixed(1)}{' '}
          <span className="text-sm font-normal text-stone-400">{unit}</span>
        </span>
        <span className="text-xs text-stone-400">{quantity} pz</span>
      </div>
    );
  }
  const low = isLowStock(product);
  return (
    <span className={cn("text-lg font-medium", low ? "text-red-600" : "text-stone-900")}>
      {product.quantity} <span className="text-sm font-normal text-stone-400">pz</span>
    </span>
  );
}

const ProductCard = ({ product, onClick }: { product: Product; onClick: () => void }) => {
  const low = isLowStock(product);
  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4 cursor-pointer hover:border-brand-dark/30 hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={low
          ? { backgroundColor: '#fef2f2', color: '#dc2626' }
          : { backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-icon-color)' }}
      >
        <Box className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-stone-900 truncate">{product.name}</h3>
        <p className="text-sm text-stone-500 truncate">{product.brand} &bull; {product.category}</p>
      </div>
      <div className="flex flex-col items-end shrink-0">
        {formatStock(product)}
        {low && (
          <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-red-600 mt-1 bg-red-50 px-2 py-0.5 rounded-sm">
            <AlertCircle className="w-3 h-3" /> Scorta scarsa
          </span>
        )}
      </div>
    </div>
  );
};

export const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const { data: products = [], isLoading, isError } = useListProducts();

  // Brands/categories are free text: group them ignoring case and surrounding
  // spaces so "artego", "Artego " and "ARTEGO" collapse into one card.
  const normalize = (s: string) => s.trim().toLowerCase();

  // Most frequent spelling wins as the display name of a group
  const groupBy = (values: string[]): Map<string, string> => {
    const variants = new Map<string, Map<string, number>>();
    for (const raw of values) {
      const key = normalize(raw);
      if (!key) continue;
      const display = raw.trim();
      const counts = variants.get(key) ?? new Map<string, number>();
      counts.set(display, (counts.get(display) ?? 0) + 1);
      variants.set(key, counts);
    }
    const result = new Map<string, string>();
    for (const [key, counts] of variants) {
      let best = '';
      let bestCount = -1;
      for (const [display, count] of counts) {
        if (count > bestCount) { best = display; bestCount = count; }
      }
      result.set(key, best);
    }
    return result;
  };

  const brandNames = groupBy(products.map(p => p.brand));
  const brands = Array.from(brandNames, ([key, name]) => {
    const group = products.filter(p => normalize(p.brand) === key);
    return {
      key,
      name,
      count: group.length,
      hasLowStock: group.some(isLowStock),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, 'it'));

  const brandProducts = selectedBrand
    ? products.filter(p => normalize(p.brand) === selectedBrand)
    : [];

  const selectedBrandName = selectedBrand
    ? (brandNames.get(selectedBrand) ?? selectedBrand)
    : '';

  const categoryNames = groupBy(brandProducts.map(p => p.category));
  const categories = Array.from(categoryNames, ([key, name]) => ({ key, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'));

  // Ignore a stale category (e.g. after editing the last product of that category)
  const activeCategory = selectedCategory && categoryNames.has(selectedCategory)
    ? selectedCategory
    : null;

  const openBrand = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedCategory(null);
    setSearchTerm('');
  };

  const closeBrand = () => {
    setSelectedBrand(null);
    setSelectedCategory(null);
    setSearchTerm('');
  };

  const query = searchTerm.trim().toLowerCase();

  // Root view: typing searches across all products (name or brand), otherwise brand cards
  const globalResults = products.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.brand.toLowerCase().includes(query)
  );

  const visibleBrandProducts = brandProducts.filter(p =>
    (!activeCategory || normalize(p.category) === activeCategory) &&
    (!query || p.name.toLowerCase().includes(query))
  );

  return (
    <div className="flex flex-col gap-6 page-enter">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-stone-900">Magazzino</h1>
        <button onClick={() => store.openModal('isNewProductOpen')} className="btn-brand hidden md:flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuovo Prodotto
        </button>
      </div>

      {selectedBrand && (
        <div className="flex items-center gap-3 -mb-2">
          <button
            onClick={closeBrand}
            className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0 text-stone-600 hover:border-brand-dark/30 hover:shadow-sm transition-all active:scale-95"
            aria-label="Torna alle marche"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-xl font-medium text-stone-900 truncate">{selectedBrandName}</h2>
            <p className="text-xs text-stone-500">
              {brandProducts.length} {brandProducts.length === 1 ? 'prodotto' : 'prodotti'}
            </p>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder={selectedBrand ? `Cerca in ${selectedBrandName}...` : 'Cerca prodotto o marca...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-stone-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-brand-dark focus:ring-1 focus:ring-brand-dark transition-all shadow-sm"
        />
      </div>

      {selectedBrand && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mt-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95",
              !activeCategory
                ? "btn-brand text-white border-transparent"
                : "bg-white text-stone-600 border-stone-200 hover:border-brand-dark/30"
            )}
          >
            Tutte
          </button>
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-95",
                activeCategory === cat.key
                  ? "btn-brand text-white border-transparent"
                  : "bg-white text-stone-600 border-stone-200 hover:border-brand-dark/30"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
      ) : isError ? (
        <div className="py-12 flex flex-col items-center justify-center text-red-500 gap-2">
          <AlertCircle className="w-8 h-8 opacity-70" />
          <p className="text-sm">Errore nel caricamento del magazzino.</p>
        </div>
      ) : selectedBrand ? (
        visibleBrandProducts.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
            <Box className="w-8 h-8 opacity-50" />
            <p className="text-sm">Nessun prodotto trovato.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {visibleBrandProducts.map(product => (
              <ProductCard key={product.id} product={product} onClick={() => setEditProductId(product.id)} />
            ))}
          </div>
        )
      ) : query ? (
        globalResults.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
            <Box className="w-8 h-8 opacity-50" />
            <p className="text-sm">Nessun prodotto trovato.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {globalResults.map(product => (
              <ProductCard key={product.id} product={product} onClick={() => setEditProductId(product.id)} />
            ))}
          </div>
        )
      ) : brands.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-2">
          <Box className="w-8 h-8 opacity-50" />
          <p className="text-sm">Nessun prodotto in magazzino.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {brands.map(brand => (
            <div
              key={brand.key}
              onClick={() => openBrand(brand.key)}
              className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4 cursor-pointer hover:border-brand-dark/30 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-icon-color)' }}
              >
                <Tag className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-stone-900 truncate">{brand.name}</h3>
                <p className="text-sm text-stone-500 whitespace-nowrap">
                  {brand.count} {brand.count === 1 ? 'prodotto' : 'prodotti'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {brand.hasLowStock && (
                  <span className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center" title="Scorta scarsa">
                    <AlertCircle className="w-4 h-4" />
                  </span>
                )}
                <ChevronRight className="w-5 h-5 text-stone-300" />
              </div>
            </div>
          ))}
        </div>
      )}

      <EditProductModal
        isOpen={!!editProductId}
        onClose={() => setEditProductId(null)}
        productId={editProductId}
      />
    </div>
  );
};
