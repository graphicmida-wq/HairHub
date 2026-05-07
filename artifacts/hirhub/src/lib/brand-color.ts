export interface BrandPalette {
  key: string;
  label: string;
  primary: string;
  dark: string;
  muted: string;
  light: string;
}

export const BRAND_PRESETS: BrandPalette[] = [
  {
    key: 'pergamena',
    label: 'Pergamena',
    primary: '#5c5870',
    dark: '#3a3748',
    muted: '#c8c4d4',
    light: '#f3f3f2',
  },
  {
    key: 'viola',
    label: 'Viola',
    primary: '#7c3aed',
    dark: '#4c1d95',
    muted: '#ddd6fe',
    light: '#f5f3ff',
  },
  {
    key: 'indaco',
    label: 'Indaco',
    primary: '#4f46e5',
    dark: '#312e81',
    muted: '#c7d2fe',
    light: '#eef2ff',
  },
  {
    key: 'salvia',
    label: 'Salvia',
    primary: '#4d7c5e',
    dark: '#2d4f3a',
    muted: '#a7c4b4',
    light: '#f0f7f3',
  },
  {
    key: 'rosa',
    label: 'Rosa',
    primary: '#9f4f6a',
    dark: '#6b2d45',
    muted: '#e4b8c5',
    light: '#fdf2f5',
  },
  {
    key: 'terracotta',
    label: 'Terracotta',
    primary: '#c2714f',
    dark: '#8b4a30',
    muted: '#e8c4b5',
    light: '#fdf5f2',
  },
  {
    key: 'ardesia',
    label: 'Ardesia',
    primary: '#4b5563',
    dark: '#1f2937',
    muted: '#bcc4cf',
    light: '#f1f3f5',
  },
  {
    key: 'oro',
    label: 'Oro',
    primary: '#b45309',
    dark: '#78350f',
    muted: '#e8c97a',
    light: '#fdfbf0',
  },
];

const DEFAULT_PALETTE = BRAND_PRESETS[0]!;
const LS_KEY = 'hirhub_brand_color';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1]!, 16),
        g: parseInt(result[2]!, 16),
        b: parseInt(result[3]!, 16),
      }
    : null;
}

function adjustBrightness(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(rgb.r * factor);
  const g = clamp(rgb.g * factor);
  const b = clamp(rgb.b * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function mixWithWhite(hex: string, ratio: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(rgb.r + (255 - rgb.r) * ratio);
  const g = clamp(rgb.g + (255 - rgb.g) * ratio);
  const b = clamp(rgb.b + (255 - rgb.b) * ratio);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function paletteFromCustomColor(primary: string): BrandPalette {
  return {
    key: 'custom',
    label: 'Personalizzato',
    primary,
    dark: adjustBrightness(primary, 0.65),
    muted: mixWithWhite(primary, 0.6),
    light: mixWithWhite(primary, 0.92),
  };
}

export function applyBrandPalette(palette: BrandPalette) {
  const root = document.documentElement;
  root.style.setProperty('--color-brand-primary', palette.primary);
  root.style.setProperty('--color-brand-dark', palette.dark);
  root.style.setProperty('--color-brand-muted', palette.muted);
  root.style.setProperty('--color-brand-light', palette.light);
  const iconBg = mixWithWhite(palette.primary, 0.82);
  root.style.setProperty('--color-brand-icon-bg', iconBg);
  root.style.setProperty('--color-brand-icon-color', palette.primary);
  root.style.setProperty('--color-brand-gold', palette.primary);
  root.style.setProperty('--color-brand-gold-bg', iconBg);
}

export function saveBrandPalette(palette: BrandPalette) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(palette));
  } catch {}
}

export function loadBrandPalette(): BrandPalette {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BrandPalette;
      if (parsed.primary && parsed.dark && parsed.muted && parsed.light) {
        return parsed;
      }
    }
  } catch {}
  return DEFAULT_PALETTE;
}
