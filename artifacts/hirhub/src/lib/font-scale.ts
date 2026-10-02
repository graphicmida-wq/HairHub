import { useSyncExternalStore } from 'react';

/**
 * Text size (Impostazioni → Dimensione del testo). The interface is sized in
 * rem, so scaling the root font size enlarges text, spacing, buttons and icons
 * together, like the browser zoom. Fixed levels keep it within what the layout
 * can take. Saved per device: the owner can have it large on the desk computer
 * without enlarging the staff's phones.
 */

export interface FontScaleLevel {
  key: string;
  label: string;
  scale: number;
}

export const FONT_SCALE_LEVELS: FontScaleLevel[] = [
  { key: 'piccolo', label: 'Piccolo', scale: 0.9 },
  { key: 'normale', label: 'Normale', scale: 1 },
  { key: 'grande', label: 'Grande', scale: 1.15 },
  { key: 'molto-grande', label: 'Molto grande', scale: 1.3 },
];

export const DEFAULT_FONT_SCALE = 1;

const LS_KEY = 'lumii-font-scale';
const listeners = new Set<() => void>();

/**
 * Narrowest layout the pages are designed for (a small phone). On a screen that
 * would get narrower than this once enlarged, the enlargement is capped, so a
 * phone at "Molto grande" gets a bit less than 130% instead of a broken page.
 */
const MIN_LAYOUT_WIDTH = 340;

/** Tailwind's breakpoints, in rem of the scaled root font size (see index.css). */
const BREAKPOINTS = { sm: 40, md: 48, lg: 64, xl: 80, '2xl': 96 } as const;
export type Breakpoint = keyof typeof BREAKPOINTS;

/** Level picked in Impostazioni */
let chosen = DEFAULT_FONT_SCALE;
/** Scale in use: the chosen one, capped on narrow screens */
let applied = DEFAULT_FONT_SCALE;

export function normalizeFontScale(value: unknown): number {
  const n = Number(value);
  return FONT_SCALE_LEVELS.some(l => l.scale === n) ? n : DEFAULT_FONT_SCALE;
}

export function loadFontScale(): number {
  try {
    return normalizeFontScale(localStorage.getItem(LS_KEY) ?? DEFAULT_FONT_SCALE);
  } catch {
    return DEFAULT_FONT_SCALE;
  }
}

/**
 * Sets the root font size and <html data-bp>. Media queries measure rem against
 * the browser's default size, ignoring the scaled root, so the breakpoints are
 * computed here instead. Runs again on resize (e.g. a phone turned sideways).
 */
function render() {
  const root = document.documentElement;
  applied = chosen <= 1 ? chosen : Math.max(1, Math.min(chosen, window.innerWidth / MIN_LAYOUT_WIDTH));
  // A percentage keeps the browser's own text size setting in the mix
  const fontSize = applied === 1 ? '' : `${+(applied * 100).toFixed(2)}%`;
  if (root.style.fontSize !== fontSize) root.style.fontSize = fontSize;

  const remPx = parseFloat(getComputedStyle(root).fontSize) || 16;
  const widthRem = window.innerWidth / remPx;
  const bp = (Object.keys(BREAKPOINTS) as Breakpoint[]).filter(b => widthRem >= BREAKPOINTS[b]).join(' ');
  if (root.dataset.bp !== bp) root.dataset.bp = bp;

  listeners.forEach(l => l());
}

export function applyFontScale(scale: number) {
  chosen = normalizeFontScale(scale);
  render();
}

window.addEventListener('resize', render);

export function saveFontScale(scale: number) {
  try {
    localStorage.setItem(LS_KEY, String(normalizeFontScale(scale)));
  } catch {}
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/**
 * Current scale, for the few sizes computed in JS as pixels (agenda grid,
 * chart labels): multiply them by it so they grow with the rest.
 */
export function useFontScale(): number {
  return useSyncExternalStore(subscribe, () => applied);
}

/** Level picked in Impostazioni, and the scale this screen actually allows. */
export function useFontScaleChoice(): { chosen: number; applied: number } {
  const chosenNow = useSyncExternalStore(subscribe, () => chosen);
  return { chosen: chosenNow, applied: useFontScale() };
}

/** JS counterpart of the md:/lg:… variants, on the same scaled width. */
export function useBreakpoint(bp: Breakpoint): boolean {
  return useSyncExternalStore(subscribe, () =>
    (document.documentElement.dataset.bp ?? '').split(' ').includes(bp));
}
