import React, { useState } from 'react';
import { store } from '../lib/store';
import { useListProducts } from '@workspace/api-client-react';
import { Box, Search, AlertCircle, Plus, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { EditProductModal } from '../components/EditProductModal';

export const Inventory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const { data: products = [], isLoading } = useListProducts();

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif text-stone-900">Magazzino</h2>
        <button onClick={() => store.openModal('isNewProductOpen')} className="hidden md:flex items-center gap-2 bg-stone-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors">
          <Plus className="w-4 h-4" /> Nuovo Prodotto
        </button>
      </div>

      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          placeholder="Cerca prodotto o marca..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-stone-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:border-brand-dark focus:ring-1 focus:ring-brand-dark transition-all shadow-sm"
        />
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-stone-400" /></div>
        ) : (
          filteredProducts.map(product => {
            const isLowStock = product.quantity <= product.minThreshold;
            return (
              <div
                key={product.id}
                onClick={() => setEditProductId(product.id)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex items-center gap-4 cursor-pointer hover:border-brand-dark/30 hover:shadow-md transition-all active:scale-[0.98]"
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  isLowStock ? "bg-red-50 text-red-600" : "bg-stone-50 text-stone-600"
                )}>
                  <Box className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-stone-900 truncate">{product.name}</h3>
                  <p className="text-sm text-stone-500">{product.brand} &bull; {product.category}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={cn("text-lg font-medium", isLowStock ? "text-red-600" : "text-stone-900")}>
                    {product.quantity} <span className="text-sm font-normal text-stone-400">pz</span>
                  </span>
                  {isLowStock && (
                    <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-red-600 mt-1 bg-red-50 px-2 py-0.5 rounded-sm">
                      <AlertCircle className="w-3 h-3" /> Scorta scarsa
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <EditProductModal
        isOpen={!!editProductId}
        onClose={() => setEditProductId(null)}
        productId={editProductId}
      />
    </div>
  );
};
