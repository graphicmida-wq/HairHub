/**
 * Page background (the area behind the white cards) and the colour of the text
 * written directly on it. On a dark background that text switches to light so
 * page titles, section headings and empty states stay readable.
 */

export interface BackgroundPreset {
  key: string;
  label: string;
  color: string;
}

/** The warm grey the app has always had. */
export const DEFAULT_BACKGROUND = '#e4e3df';

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { key: 'grigio', label: 'Grigio caldo', color: DEFAULT_BACKGROUND },
  { key: 'bianco', label: 'Bianco', color: '#f8f8f7' },
  { key: 'avorio', label: 'Avorio', color: '#f4efe4' },
  { key: 'sabbia', label: 'Sabbia', color: '#e6dccb' },
  { key: 'perla', label: 'Grigio perla', color: '#e3e5e8' },
  { key: 'cipria', label: 'Cipria', color: '#f1e2e1' },
  { key: 'salvia', label: 'Salvia', color: '#dfe8e0' },
  { key: 'cielo', label: 'Cielo', color: '#dde7f1' },
  { key: 'tortora', label: 'Tortora', color: '#cfc6ba' },
  { key: 'ardesia', label: 'Ardesia', color: '#4b5563' },
  { key: 'antracite', label: 'Antracite', color: '#2a2a2d' },
  { key: 'notte', label: 'Notte', color: '#1e2638' },
];

const LS_KEY = 'lumii-page-background';
const HEX_RE = /^#[0-9a-f]{6}$/i;

// Overrides for a dark background: light text, and no see-through cards
const DARK_BACKGROUND_OVERRIDES = {
  '--color-on-page': '#fafaf9',
  '--color-on-page-muted': 'rgba(250, 250, 249, 0.72)',
  '--color-on-page-brand': '#fafaf9',
  '--color-on-page-link': '#fafaf9',
  '--color-page-card-soft': '#ffffff',
};

export function normalizeBackground(color: string | null | undefined): string {
  return color && HEX_RE.test(color) ? color.toLowerCase() : DEFAULT_BACKGROUND;
}

export function relativeLuminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** True when light text reads better than the usual dark text on this colour. */
export function needsLightText(color: string): boolean {
  const l = relativeLuminance(normalizeBackground(color));
  const onDark = (l + 0.05) / (relativeLuminance('#1c1917') + 0.05);
  const onLight = (relativeLuminance('#fafaf9') + 0.05) / (l + 0.05);
  return onLight > onDark;
}

export function applyPageBackground(color: string | null | undefined) {
  const bg = normalizeBackground(color);
  const root = document.documentElement;
  root.style.setProperty('--color-page-bg', bg);
  const dark = needsLightText(bg);
  for (const [name, value] of Object.entries(DARK_BACKGROUND_OVERRIDES)) {
    // Without an override the defaults from index.css (dark text) apply
    if (dark) root.style.setProperty(name, value);
    else root.style.removeProperty(name);
  }
}

export function savePageBackground(color: string | null | undefined) {
  try {
    localStorage.setItem(LS_KEY, normalizeBackground(color));
  } catch {}
}

export function loadPageBackground(): string {
  try {
    return normalizeBackground(localStorage.getItem(LS_KEY));
  } catch {
    return DEFAULT_BACKGROUND;
  }
}
