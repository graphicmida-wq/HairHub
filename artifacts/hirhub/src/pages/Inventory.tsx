import React, { useState } from 'react';
import { store } from '../lib/store';
import { useListProducts, type Product } from '@workspace/api-client-react';
import { Box, Search, AlertCircle, Plus, Loader2, Tag, ChevronRight, ArrowLeft, Palette, CornerDownRight } from 'lucide-react';
import { cn, compareText } from '../lib/utils';
import { EditProductModal } from '../components/EditProductModal';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { BrandColorPicker, solidTileStyle, tintTileStyle, useBrandColors, useSaveBrandColor } from '../lib/product-brand-colors';
import { toast } from '../components/Toast';
import { useCatalog } from '../lib/catalog';
import { GuideLink } from '../components/GuideLink';

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
        <span className={cn("text-xl font-semibold", low ? "text-red-600" : "text-stone-900")}>
          {product.stockGrams % 1 === 0 ? product.stockGrams : product.stockGrams.toFixed(1)}{' '}
          <span className="text-sm font-medium text-stone-500">{unit}</span>
        </span>
        <span className={cn("text-sm font-semibold", low ? "text-red-600" : "text-stone-500")}>{quantity} pz</span>
      </div>
    );
  }
  const low = isLowStock(product);
  return (
    <span className={cn("text-xl font-semibold", low ? "text-red-600" : "text-stone-900")}>
      {product.quantity} <span className="text-sm font-medium text-stone-500">pz</span>
    </span>
  );
}

const ProductCard = ({ product, brandColor, onClick }: { product: Product; brandColor: string | null; onClick: () => void }) => {
  const low = isLowStock(product);
  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4 cursor-pointer hover:border-brand-dark/30 hover:shadow-md transition-all active:scale-[0.98]"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        // The brand colour identifies the product; low stock still shows in red on the quantity and badge
        style={brandColor
          ? tintTileStyle(brandColor)
          : low
            ? { backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }
            : { backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-icon-color)' }}
      >
        <Box className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-stone-900 uppercase break-words leading-tight">{product.name}</h3>
        <p className="text-sm text-stone-500 truncate"><span className="uppercase">{product.brand}</span> &bull; {product.category}</p>
        {(product.subcategories ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {product.subcategories!.map(sub => (
              <span key={sub} className="text-[0.6875rem] leading-none px-2 py-1 rounded-full bg-stone-100 text-stone-600">{sub}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {low && (
          <span className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center" title="Scorta scarsa">
            <AlertCircle className="w-4 h-4" />
          </span>
        )}
        {formatStock(product)}
      </div>
    </div>
  );
};

export const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorOf = useBrandColors();
  const { mutate: saveBrandColor } = useSaveBrandColor();
  const { data: unsortedProducts = [], isLoading, isError } = useListProducts();
  const { brands: catalogBrands } = useCatalog();
  const products = [...unsortedProducts].sort((a, b) => compareText(a.name, b.name) || compareText(a.brand, b.brand));

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
  // Brands of the salon with no product yet (Impostazioni → Marche e categorie) get a card too
  for (const b of catalogBrands) {
    const key = normalize(b.name);
    if (key && !brandNames.has(key)) brandNames.set(key, b.name.trim());
  }
  const brands = Array.from(brandNames, ([key, name]) => {
    const group = products.filter(p => normalize(p.brand) === key);
    return {
      key,
      name,
      count: group.length,
      hasLowStock: group.some(isLowStock),
      color: colorOf(key),
    };
  }).sort((a, b) => compareText(a.name, b.name));

  const brandProducts = selectedBrand
    ? products.filter(p => normalize(p.brand) === selectedBrand)
    : [];

  const selectedBrandName = selectedBrand
    ? (brandNames.get(selectedBrand) ?? selectedBrand)
    : '';
  const selectedBrandColor = selectedBrand ? colorOf(selectedBrand) : null;

  const changeBrandColor = (color: string | null) => {
    if (!selectedBrand) return;
    saveBrandColor(
      { data: { brand: selectedBrand, color } },
      { onError: () => toast.show('Errore nel salvataggio del colore', 'error') },
    );
  };

  const categoryNames = groupBy(brandProducts.map(p => p.category));
  const categories = Array.from(categoryNames, ([key, name]) => ({ key, name }))
    .sort((a, b) => compareText(a.name, b.name));

  // Ignore a stale category (e.g. after editing the last product of that category)
  const activeCategory = selectedCategory && categoryNames.has(selectedCategory)
    ? selectedCategory
    : null;

  // Second row of filters: sub-categories of the chosen category, within this brand
  const subNames = groupBy(
    activeCategory
      ? brandProducts.filter(p => normalize(p.category) === activeCategory).flatMap(p => p.subcategories ?? [])
      : []
  );
  const subcategories = Array.from(subNames, ([key, name]) => ({ key, name }))
    .sort((a, b) => compareText(a.name, b.name));
  const activeSub = selectedSub && subNames.has(selectedSub) ? selectedSub : null;

  const chooseCategory = (key: string | null) => {
    setSelectedCategory(key);
    setSelectedSub(null);
  };

  const openBrand = (brand: string) => {
    setSelectedBrand(brand);
    chooseCategory(null);
    setSearchTerm('');
  };

  const closeBrand = () => {
    setSelectedBrand(null);
    chooseCategory(null);
    setSearchTerm('');
  };

  const query = searchTerm.trim().toLowerCase();

  const subMatches = (p: Product) => (p.subcategories ?? []).some(sub => sub.toLowerCase().includes(query));

  // Root view: typing searches across all products (name, brand or sub-category), otherwise brand cards
  const globalResults = products.filter(p =>
    p.name.toLowerCase().includes(query) ||
    p.brand.toLowerCase().includes(query) ||
    subMatches(p)
  );

  const visibleBrandProducts = brandProducts.filter(p =>
    (!activeCategory || normalize(p.category) === activeCategory) &&
    (!activeSub || (p.subcategories ?? []).some(sub => normalize(sub) === activeSub)) &&
    (!query || p.name.toLowerCase().includes(query) || subMatches(p))
  );

  return (
    <div className="flex flex-col gap-6 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-serif text-on-page">Magazzino</h1>
          <GuideLink chapter="magazzino" />
        </div>
        <button onClick={() => store.openModal('isNewProductOpen', selectedBrand ? selectedBrandName : null)} className="btn-brand hidden md:flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
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
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-medium text-on-page truncate uppercase">{selectedBrandName}</h2>
            <p className="text-xs text-on-page-muted">
              {brandProducts.length} {brandProducts.length === 1 ? 'prodotto' : 'prodotti'}
            </p>
          </div>
          {/* Phones: the "Nuovo Prodotto" button above is hidden, this one keeps the brand */}
          <button
            onClick={() => store.openModal('isNewProductOpen', selectedBrandName)}
            className="md:hidden shrink-0 w-10 h-10 flex items-center justify-center bg-white border border-stone-200 rounded-xl text-stone-700 active:scale-95 transition-all"
            aria-label={`Nuovo prodotto ${selectedBrandName}`}
          >
            <Plus className="w-5 h-5" />
          </button>
          <Popover open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
            <PopoverTrigger asChild>
              <button
                className="shrink-0 flex items-center gap-2 bg-white border border-stone-200 rounded-xl pl-2.5 pr-3 py-2 text-sm font-medium text-stone-700 hover:border-brand-dark/30 hover:shadow-sm transition-all active:scale-95"
                aria-label="Colore della marca"
              >
                {selectedBrandColor
                  ? <span className="w-5 h-5 rounded-full" style={{ backgroundColor: selectedBrandColor }} />
                  : <Palette className="w-5 h-5 text-stone-400" />}
                {/* Phones: just the colour, so the brand name keeps its room */}
                <span className="hidden md:inline">Colore</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 rounded-2xl">
              <p className="text-sm font-medium text-stone-900 mb-3">Colore di <span className="uppercase">{selectedBrandName}</span></p>
              <BrandColorPicker
                value={selectedBrandColor}
                onChange={color => { changeBrandColor(color); setColorPickerOpen(false); }}
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder={selectedBrand ? `Cerca in ${selectedBrandName.toUpperCase()}...` : 'Cerca prodotto o marca...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-stone-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-brand-dark focus:ring-1 focus:ring-brand-dark transition-all shadow-sm"
        />
      </div>

      {selectedBrand && categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mt-2">
          <button
            onClick={() => chooseCategory(null)}
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
              onClick={() => chooseCategory(cat.key)}
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

      {selectedBrand && activeCategory && subcategories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mt-3">
          <CornerDownRight className="w-4 h-4 shrink-0 text-on-page-muted" aria-hidden />
          <button
            onClick={() => setSelectedSub(null)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95",
              !activeSub
                ? "btn-brand text-white border-transparent"
                : "bg-white text-stone-600 border-stone-200 hover:border-brand-dark/30"
            )}
          >
            Tutte
          </button>
          {subcategories.map(sub => (
            <button
              key={sub.key}
              // Tapping the active one again goes back to all
              onClick={() => setSelectedSub(activeSub === sub.key ? null : sub.key)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all active:scale-95",
                activeSub === sub.key
                  ? "btn-brand text-white border-transparent"
                  : "bg-white text-stone-600 border-stone-200 hover:border-brand-dark/30"
              )}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-on-page-muted" /></div>
      ) : isError ? (
        <div className="py-12 flex flex-col items-center justify-center text-red-500 gap-2">
          <AlertCircle className="w-8 h-8 opacity-70" />
          <p className="text-sm">Errore nel caricamento del magazzino.</p>
        </div>
      ) : selectedBrand ? (
        brandProducts.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-on-page-muted gap-3">
            <Box className="w-8 h-8 opacity-50" />
            <p className="text-sm">Ancora nessun prodotto di questa marca.</p>
            <button onClick={() => store.openModal('isNewProductOpen', selectedBrandName)}
              className="btn-brand flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
              <Plus className="w-4 h-4" /> Aggiungi il primo prodotto
            </button>
          </div>
        ) : visibleBrandProducts.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-on-page-muted gap-2">
            <Box className="w-8 h-8 opacity-50" />
            <p className="text-sm">Nessun prodotto trovato.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
            {visibleBrandProducts.map(product => (
              <ProductCard key={product.id} product={product} brandColor={colorOf(product.brand)} onClick={() => setEditProductId(product.id)} />
            ))}
          </div>
        )
      ) : query ? (
        globalResults.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-on-page-muted gap-2">
            <Box className="w-8 h-8 opacity-50" />
            <p className="text-sm">Nessun prodotto trovato.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
            {globalResults.map(product => (
              <ProductCard key={product.id} product={product} brandColor={colorOf(product.brand)} onClick={() => setEditProductId(product.id)} />
            ))}
          </div>
        )
      ) : brands.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-on-page-muted gap-2">
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
                style={brand.color
                  ? solidTileStyle(brand.color)
                  : { backgroundColor: 'var(--color-brand-icon-bg)', color: 'var(--color-brand-icon-color)' }}
              >
                <Tag className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-stone-900 truncate uppercase">{brand.name}</h3>
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
