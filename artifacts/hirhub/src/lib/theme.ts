import { useSyncExternalStore } from 'react';

/**
 * Look of the app (Impostazioni → Aspetto). "Classico" is the light look the app
 * has always had; "Premium" is a dark, glassy look tinted by the brand colour
 * (theme-premium.css). Saved per device, like the text size: the owner can try
 * it on one screen without changing the others, and switch back at any time.
 */

export type ThemeMode = 'classico' | 'premium';

export const DEFAULT_THEME: ThemeMode = 'classico';

const LS_KEY = 'lumii-theme';
const listeners = new Set<() => void>();
let current: ThemeMode = DEFAULT_THEME;
/** Page background of the Premium look, for the phone status bar */
let premiumBackground = '#0b1220';
/** Status bar colour from index.html, restored when going back to Classico */
let classicStatusBar: string | null = null;

export function normalizeTheme(value: unknown): ThemeMode {
  return value === 'premium' ? 'premium' : DEFAULT_THEME;
}

export function loadTheme(): ThemeMode {
  try {
    return normalizeTheme(localStorage.getItem(LS_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(LS_KEY, mode);
  } catch {}
}

function updateStatusBar() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) return;
  classicStatusBar ??= meta.content;
  meta.content = current === 'premium' ? premiumBackground : classicStatusBar;
}

export function applyTheme(mode: ThemeMode) {
  current = normalizeTheme(mode);
  const root = document.documentElement;
  if (current === 'premium') root.dataset.theme = 'premium';
  else delete root.dataset.theme;
  updateStatusBar();
  listeners.forEach(l => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function useTheme(): ThemeMode {
  return useSyncExternalStore(subscribe, () => current);
}

// ── Premium palette, derived from the brand colour ──────────────────────────

interface Hsl { h: number; s: number; l: number }

function hexToHsl(hex: string): Hsl {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r ? ((g - b) / d + (g < b ? 6 : 0)) * 60
    : max === g ? ((b - r) / d + 2) * 60
    : ((r - g) / d + 4) * 60;
  return { h, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x]
    : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round(Math.max(0, Math.min(1, v + m)) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Lightest tone of this hue that still keeps white text readable (4.5:1) */
function solidForWhiteText(h: number, s: number, start: number): string {
  for (let l = start; l > 0.2; l -= 0.01) {
    const hex = hslToHex({ h, s, l });
    if (contrast(hex, '#ffffff') >= 4.5) return hex;
  }
  return hslToHex({ h, s, l: 0.2 });
}

/** Darkest tone of this hue that still reads as text on the background (4.5:1) */
function textOn(background: string, h: number, s: number, start: number): string {
  for (let l = start; l < 0.95; l += 0.01) {
    const hex = hslToHex({ h, s, l });
    if (contrast(hex, background) >= 4.5) return hex;
  }
  return hslToHex({ h, s, l: 0.95 });
}

/**
 * Sets the --pm-* colours of the Premium look from the brand colour: a deep
 * background in the brand's hue, a bright "neon" accent and its neighbours,
 * button fills that keep white text readable. Set even in Classico (unused
 * there), so switching look is instant.
 */
export function applyPremiumPalette(brandPrimary: string) {
  const { h, s } = hexToHsl(brandPrimary);
  // A grey brand (Ardesia) stays grey instead of turning into a strong blue
  const neutral = s < 0.18;
  const bgS = neutral ? s * 0.6 : Math.min(0.68, s + 0.24);
  const neonS = neutral ? Math.min(0.25, s + 0.08) : Math.max(s, 0.85);

  const bg0 = hslToHex({ h, s: bgS, l: 0.085 });
  const bg1 = hslToHex({ h, s: bgS, l: 0.2 });
  const surface = hslToHex({ h, s: bgS * 0.85, l: 0.135 });
  // Shades of the brand: same family, the hue slightly turned for the gradients and mini-charts
  const neon = textOn(bg1, h, neonS, 0.6);
  const vars: Record<string, string> = {
    '--pm-bg-0': bg0,
    '--pm-bg-1': bg1,
    '--pm-surface': surface,
    '--pm-neon': neon,
    '--pm-neon-2': textOn(bg1, h + 28, neonS, 0.62),
    '--pm-shade-1': neon,
    '--pm-shade-2': textOn(bg1, h + 14, neonS, 0.66),
    '--pm-shade-3': textOn(bg1, h - 14, neonS * 0.9, 0.7),
    '--pm-shade-4': textOn(bg1, h + 28, neonS * 0.8, 0.74),
    '--pm-solid': solidForWhiteText(h, neonS, 0.55),
    '--pm-solid-2': solidForWhiteText(h + 28, neonS, 0.55),
    '--pm-text-brand': hslToHex({ h, s: Math.min(s, 0.45), l: 0.9 }),
    '--pm-text-muted': textOn(bg1, h, Math.min(s, 0.22), 0.68),
  };
  const root = document.documentElement;
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  premiumBackground = bg0;
  if (current === 'premium') updateStatusBar();
}
