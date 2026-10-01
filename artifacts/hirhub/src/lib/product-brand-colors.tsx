/**
 * Colours of product brands. Brands are free text on products (picked like tags);
 * a colour is attached to the brand name normalised the same way Magazzino groups
 * brands, so "Artego" and "ARTEGO " share it. A brand without a colour stays neutral.
 */
import { useCallback, useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { getListBrandColorsQueryKey, useListBrandColors, useSetBrandColor } from '@workspace/api-client-react';
import { cn } from './utils';
import { mixWithWhite } from './brand-color';
import { relativeLuminance } from './page-background';

export const BRAND_COLOR_SWATCHES: { color: string; label: string }[] = [
  { color: '#2a78d6', label: 'Blu' },
  { color: '#0f8b8d', label: 'Petrolio' },
  { color: '#1baf7a', label: 'Acqua' },
  { color: '#3f8f3f', label: 'Verde' },
  { color: '#eda100', label: 'Giallo' },
  { color: '#eb6834', label: 'Arancio' },
  { color: '#e34948', label: 'Rosso' },
  { color: '#c2185b', label: 'Fucsia' },
  { color: '#e87ba4', label: 'Rosa' },
  { color: '#7b5cd6', label: 'Viola' },
  { color: '#8b5e3c', label: 'Marrone' },
  { color: '#4b5563', label: 'Grigio' },
];

export const brandKey = (brand: string) => brand.trim().toLowerCase();

/** Returns a lookup brand name → colour (null when the brand has none). */
export function useBrandColors() {
  const { data = [] } = useListBrandColors();
  const byKey = useMemo(() => new Map(data.map(b => [b.brand, b.color])), [data]);
  return useCallback(
    (brand: string | null | undefined) => (brand ? byKey.get(brandKey(brand)) ?? null : null),
    [byKey],
  );
}

export function useSaveBrandColor() {
  const queryClient = useQueryClient();
  return useSetBrandColor({
    mutation: {
      onSuccess: data => queryClient.setQueryData(getListBrandColorsQueryKey(), data),
    },
  });
}

/** White on the colour when it keeps 3:1 (icons); ink only on light colours like yellow. */
function inkOn(color: string): string {
  return 1.05 / (relativeLuminance(color) + 0.05) >= 3 ? '#ffffff' : '#1c1917';
}

/** Solid icon tile in a colour (brand, service) with a readable icon on it. */
export function solidTileStyle(color: string): CSSProperties {
  return { backgroundColor: color, color: inkOn(color) };
}

/** Light icon tile tinted with a colour, icon in the colour itself. */
export function tintTileStyle(color: string): CSSProperties {
  return { backgroundColor: mixWithWhite(color, 0.82), color };
}

export const BrandDot = ({ brand, className }: { brand: string | null | undefined; className?: string }) => {
  const colorOf = useBrandColors();
  const color = colorOf(brand);
  if (!color) return null;
  return (
    <span
      aria-hidden
      className={cn('inline-block w-2.5 h-2.5 rounded-full shrink-0 align-[-1px] mr-1.5', className)}
      style={{ backgroundColor: color }}
    />
  );
};

/** Swatches + free colour + "no colour"; `size="sm"` for inline use in forms. */
export const BrandColorPicker = ({ value, onChange, size = 'md' }: {
  value: string | null;
  onChange: (color: string | null) => void;
  size?: 'sm' | 'md';
}) => {
  const dot = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';

  // The native picker fires "input" continuously while dragging; commit only on
  // its "change" (when the colour is confirmed), so we don't save on every step.
  const customRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const el = customRef.current;
    if (!el) return;
    const commit = () => onChangeRef.current(el.value.toLowerCase());
    el.addEventListener('change', commit);
    return () => el.removeEventListener('change', commit);
  }, []);
  useEffect(() => {
    if (customRef.current && value) customRef.current.value = value;
  }, [value]);

  return (
    <div className="flex flex-col gap-3">
      <div className={cn('grid gap-2', size === 'sm' ? 'grid-cols-[repeat(auto-fill,1.5rem)]' : 'grid-cols-6')}>
        {BRAND_COLOR_SWATCHES.map(s => (
          <button
            key={s.color}
            type="button"
            title={s.label}
            aria-label={s.label}
            onClick={() => onChange(s.color)}
            className={cn(dot, 'rounded-full flex items-center justify-center transition-transform active:scale-90 ring-offset-2',
              value === s.color && 'ring-2 ring-stone-900')}
            style={{ backgroundColor: s.color }}
          >
            {value === s.color && <Check className="w-3.5 h-3.5" style={{ color: inkOn(s.color) }} />}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
          <input
            ref={customRef}
            type="color"
            defaultValue={value ?? '#2a78d6'}
            className="w-8 h-8 rounded-lg border border-stone-200 cursor-pointer p-0.5 bg-white"
          />
          Altro colore
        </label>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="ml-auto text-xs text-stone-500 hover:text-stone-800">
            Nessun colore
          </button>
        )}
      </div>
    </div>
  );
};
