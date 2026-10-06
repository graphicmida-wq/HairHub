import { type QueryClient } from '@tanstack/react-query';
import { getGetCatalogQueryKey, useGetCatalog, type Catalog } from '@workspace/api-client-react';

const EMPTY: Catalog = { brands: [], productCategories: [], serviceCategories: [], subcategories: [] };

/**
 * The salon's brands and categories (Impostazioni → Marche e categorie). Read
 * again at every mount: a brand typed on the fly in a product form is in the
 * list the next time a form opens.
 */
export function useCatalog(): Catalog {
  const { data } = useGetCatalog({ query: { queryKey: getGetCatalogQueryKey(), refetchOnMount: 'always' } });
  return data ?? EMPTY;
}

export function invalidateCatalog(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: getGetCatalogQueryKey() });
}

/** One entry per name ignoring case and spaces, the first spelling wins; sorted. */
export function mergeNames(...lists: string[][]): string[] {
  const byKey = new Map<string, string>();
  for (const list of lists) {
    for (const raw of list) {
      const name = (raw ?? '').trim();
      const key = name.toLowerCase();
      if (key && !byKey.has(key)) byKey.set(key, name);
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'it', { sensitivity: 'base' }));
}
