import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Alphabetical order for names: ignores case and accents, numbers by value ("7.0" before "10.0"). */
export const compareText = new Intl.Collator('it', { sensitivity: 'base', numeric: true }).compare;

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

const toMins = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

/** Hours shown by a calendar grid: 9-20, widened to fit appointments outside that range. */
export function calendarHours(items: CalItem[], fromHour = 9, toHour = 20): { startHour: number; endHour: number } {
  let startHour = fromHour;
  let endHour = toHour;
  for (const it of items) {
    const s = toMins(it.time);
    startHour = Math.min(startHour, Math.floor(s / 60));
    endHour = Math.max(endHour, Math.ceil((s + it.durationMins) / 60));
  }
  return { startHour, endHour: Math.min(endHour, 24) };
}

export interface CalendarBox<T> {
  item: T;
  top: number;
  height: number;
  /** Cascade level: each level is drawn shifted right, on top of the previous one */
  depth: number;
  /** Position among appointments of the same level drawn side by side */
  slot: number;
  slots: number;
  z: number;
  /** Height in px from the block's top that no later appointment covers */
  clearPx: number;
}

/**
 * Cascade layout for one calendar column. An appointment that starts while
 * another is running (e.g. a blow-dry during colour processing) is drawn on
 * top of it, one level to the right, leaving the earlier one's header and
 * colour visible. Appointments starting too close together for that (the
 * later one would cover the earlier one's time and name) share their level
 * side by side instead.
 */
export function computeCalendarLayout<T extends CalItem>(
  items: T[], startHour: number, hourH: number, { minH = 18, headerPx = 36 } = {},
): CalendarBox<T>[] {
  const PPM = hourH / 60;
  const closeMins = headerPx / PPM;
  type Group = { depth: number; slotEnds: number[] };
  type Ev = { it: T; s: number; e: number; depth: number; slot: number; group: Group };
  const evs: Ev[] = items
    .map(it => {
      const s = toMins(it.time);
      return { it, s, e: s + Math.max(it.durationMins, 5), depth: 0, slot: 0, group: { depth: 0, slotEnds: [] } };
    })
    .sort((a, b) => a.s - b.s || b.e - a.e);

  evs.forEach((ev, i) => {
    const running = evs.slice(0, i).filter(p => p.e > ev.s);
    const close = running.filter(p => ev.s - p.s < closeMins);
    if (close.length) {
      const group = close[close.length - 1].group;
      let slot = group.slotEnds.findIndex(end => end <= ev.s);
      if (slot === -1) slot = group.slotEnds.length;
      group.slotEnds[slot] = ev.e;
      Object.assign(ev, { group, depth: group.depth, slot });
    } else {
      const depth = running.length ? Math.max(...running.map(p => p.depth)) + 1 : 0;
      Object.assign(ev, { depth, slot: 0, group: { depth, slotEnds: [ev.e] } });
    }
  });

  return evs.map((ev, i) => ({
    item: ev.it,
    clearPx: evs.slice(i + 1).reduce(
      (min, o) => (o.depth > ev.depth && o.s < ev.e ? Math.min(min, (o.s - ev.s) * PPM) : min),
      Infinity,
    ),
    top: (ev.s - startHour * 60) * PPM,
    height: Math.max((ev.e - ev.s) * PPM, minH),
    depth: ev.depth,
    slot: ev.slot,
    slots: ev.group.slotEnds.length,
    z: i + 1,
  }));
}
