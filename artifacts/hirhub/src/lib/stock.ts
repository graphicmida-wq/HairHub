import type { QueryClient } from '@tanstack/react-query';
import {
  getListProductsQueryKey,
  getListStockMovementsQueryKey,
  type Product,
  type StockMovement,
  type StockMovementReason,
} from '@workspace/api-client-react';

/** Refresh everything that depends on stock after a sale, edit or appointment change. */
export function invalidateStock(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
  queryClient.invalidateQueries({ queryKey: getListStockMovementsQueryKey() });
}

/** Causali a user can pick when changing a product's quantity by hand. */
export const MANUAL_REASONS: { value: StockMovementReason; label: string }[] = [
  { value: 'rifornimento', label: 'Rifornimento' },
  { value: 'reso', label: 'Reso' },
  { value: 'rettifica', label: 'Rettifica inventario' },
  { value: 'danneggiato', label: 'Danneggiato / scaduto' },
  { value: 'altro', label: 'Altro' },
];

const REASON_LABELS: Record<StockMovementReason, string> = {
  vendita: 'Vendita',
  uso_servizio: 'Uso in servizio',
  rifornimento: 'Rifornimento',
  giacenza_iniziale: 'Giacenza iniziale',
  reso: 'Reso',
  rettifica: 'Rettifica inventario',
  danneggiato: 'Danneggiato / scaduto',
  altro: 'Altro',
};

export function movementLabel(m: StockMovement): string {
  if (m.reason === 'vendita') {
    if (m.quantity < 0) return m.saleId ? 'Vendita al banco' : 'Vendita in appuntamento';
    return m.saleId ? 'Vendita annullata' : 'Correzione vendita';
  }
  if (m.reason === 'uso_servizio') return m.quantity < 0 ? 'Uso in servizio' : 'Correzione uso';
  return REASON_LABELS[m.reason] ?? m.reason;
}

export type MovementKind = 'vendite' | 'uso' | 'magazzino';

export function movementKind(m: StockMovement): MovementKind {
  if (m.reason === 'vendita') return 'vendite';
  if (m.reason === 'uso_servizio') return 'uso';
  return 'magazzino';
}

const numberFmt = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 1 });

export function formatNumber(n: number): string {
  return numberFmt.format(n);
}

export function formatQty(quantity: number, unit: string): string {
  return `${numberFmt.format(quantity)} ${unit}`;
}

export function formatSignedQty(quantity: number, unit: string): string {
  return `${quantity > 0 ? '+' : '−'}${formatQty(Math.abs(quantity), unit)}`;
}

export function formatEuro(n: number): string {
  return `€${n.toFixed(2)}`;
}

/** Packages a g/ml amount corresponds to, when the product's package size is known. */
export function toPackages(quantity: number, unit: string, product: Product | undefined): number | null {
  if (unit === 'pz') return quantity;
  if (product?.unitSize && product.unitSize > 0) return quantity / product.unitSize;
  return null;
}

export function formatStock(p: Product): string {
  if (p.unitSize != null && p.stockGrams != null) {
    return `${formatQty(p.stockGrams, p.unitType ?? 'g')} (${p.quantity} pz)`;
  }
  return `${p.quantity} pz`;
}
