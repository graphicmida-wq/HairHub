import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hexAlpha(hex: string, alpha: number): string {
  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return hex.startsWith('#') ? hex + alphaHex : '#' + hex + alphaHex;
}

export const addMinsToTime = (time: string, mins: number): string => {
  const [h, m] = time.split(':').map(Number);
  const total = Math.max(0, Math.min(h * 60 + m + mins, 23 * 60 + 59));
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
};

export const timeDiffMins = (start: string, end: string): number => {
  const toM = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  return toM(end) - toM(start);
};

interface CalItem { id: string; time: string; durationMins: number; }

export function computeCalendarLayout<T extends CalItem>(
  items: T[], startHour: number, hourH: number, minH = 22,
): Array<{ item: T; top: number; height: number; leftPct: number; widthPct: number }> {
  if (items.length === 0) return [];
  const toM = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const PPM = hourH / 60;
  const es = items
    .map(it => ({ it, s: toM(it.time), e: toM(it.time) + Math.max(it.durationMins, 5) }))
    .sort((a, b) => a.s - b.s);
  const tracks: typeof es[number][][] = [];
  for (const e of es) {
    let placed = false;
    for (const t of tracks) {
      if (e.s >= t[t.length - 1].e) { t.push(e); placed = true; break; }
    }
    if (!placed) tracks.push([e]);
  }
  return es.map(e => {
    const ti = tracks.findIndex(t => t.some(x => x.it.id === e.it.id));
    const cc = tracks.filter(t => t.some(x => x.s < e.e && x.e > e.s)).length;
    return {
      item: e.it,
      top: (e.s - startHour * 60) * PPM,
      height: Math.max(e.it.durationMins * PPM, minH),
      leftPct: ti / cc,
      widthPct: 1 / cc,
    };
  });
}
