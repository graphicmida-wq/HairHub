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

/**
 * Cascade layout: overlapping appointments are shown at ~88% width with a
 * growing horizontal pixel offset per overlap level, so text stays readable.
 * Hovering raises the z-index via the caller (trackIndex drives baseZ).
 */
export function computeCalendarLayout<T extends CalItem>(
  items: T[], startHour: number, hourH: number, minH = 22,
): Array<{ item: T; top: number; height: number; leftPct: number; widthPct: number; trackIndex: number }> {
  if (items.length === 0) return [];
  const toM = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const PPM = hourH / 60;
  const es = items
    .map((it) => ({ it, s: toM(it.time), e: toM(it.time) + Math.max(it.durationMins, 5) }))
    .sort((a, b) => a.s - b.s || a.e - b.e);

  const clusters: Array<typeof es> = [];
  let current: typeof es = [];
  let currentEnd = -1;

  for (const ev of es) {
    if (current.length === 0) {
      current = [ev];
      currentEnd = ev.e;
      continue;
    }
    if (ev.s < currentEnd) {
      current.push(ev);
      currentEnd = Math.max(currentEnd, ev.e);
      continue;
    }
    clusters.push(current);
    current = [ev];
    currentEnd = ev.e;
  }
  if (current.length) clusters.push(current);

  const positions = new Map<string, { col: number; cols: number }>();

  for (const cluster of clusters) {
    const colsEnd: number[] = [];
    const colFor = new Map<string, number>();

    for (const ev of cluster) {
      let placedCol = -1;
      for (let i = 0; i < colsEnd.length; i += 1) {
        if (ev.s >= colsEnd[i]) {
          placedCol = i;
          break;
        }
      }
      if (placedCol === -1) {
        placedCol = colsEnd.length;
        colsEnd.push(ev.e);
      } else {
        colsEnd[placedCol] = ev.e;
      }
      colFor.set(ev.it.id, placedCol);
    }

    const cols = Math.max(1, colsEnd.length);
    for (const ev of cluster) {
      const col = colFor.get(ev.it.id) ?? 0;
      positions.set(ev.it.id, { col, cols });
    }
  }

  return es.map((e) => {
    const pos = positions.get(e.it.id) ?? { col: 0, cols: 1 };
    return {
      item: e.it,
      top: (e.s - startHour * 60) * PPM,
      height: Math.max(e.it.durationMins * PPM, minH),
      leftPct: pos.col / pos.cols,
      widthPct: 1 / pos.cols,
      trackIndex: pos.col,
    };
  });
}
