/** Period filter shared by Vendite and Incassi: day / week / month / year / custom range. */
import {
  addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, eachDayOfInterval,
  eachMonthOfInterval, endOfMonth, endOfWeek, endOfYear, format, isValid, parseISO,
  startOfMonth, startOfWeek, startOfYear, subDays, subMonths, subYears,
} from 'date-fns';
import { it } from 'date-fns/locale';

export type PeriodMode = 'giorno' | 'settimana' | 'mese' | 'anno' | 'periodo';

export const PERIOD_MODES: { value: PeriodMode; label: string }[] = [
  { value: 'giorno', label: 'Giorno' },
  { value: 'settimana', label: 'Settimana' },
  { value: 'mese', label: 'Mese' },
  { value: 'anno', label: 'Anno' },
  { value: 'periodo', label: 'Periodo' },
];

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export function periodRange(mode: PeriodMode, anchor: Date, customFrom: string, customTo: string) {
  switch (mode) {
    case 'giorno': return { from: anchor, to: anchor };
    case 'settimana': return { from: startOfWeek(anchor, { weekStartsOn: 1 }), to: endOfWeek(anchor, { weekStartsOn: 1 }) };
    case 'mese': return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
    case 'anno': return { from: startOfYear(anchor), to: endOfYear(anchor) };
    case 'periodo': {
      const from = parseISO(customFrom);
      const to = parseISO(customTo);
      const f = isValid(from) ? from : subDays(new Date(), 29);
      const t = isValid(to) ? to : new Date();
      return f <= t ? { from: f, to: t } : { from: t, to: f };
    }
  }
}

export function periodLabel(mode: PeriodMode, from: Date, to: Date): string {
  switch (mode) {
    case 'giorno': return capitalize(format(from, 'EEEE d MMMM yyyy', { locale: it }));
    case 'settimana': return `${format(from, 'd MMM', { locale: it })} – ${format(to, 'd MMM yyyy', { locale: it })}`;
    case 'mese': return capitalize(format(from, 'MMMM yyyy', { locale: it }));
    case 'anno': return format(from, 'yyyy');
    case 'periodo': return `${format(from, 'd MMM yyyy', { locale: it })} – ${format(to, 'd MMM yyyy', { locale: it })}`;
  }
}

export function shiftAnchor(mode: PeriodMode, anchor: Date, dir: 1 | -1): Date {
  switch (mode) {
    case 'giorno': return addDays(anchor, dir);
    case 'settimana': return addWeeks(anchor, dir);
    case 'mese': return addMonths(anchor, dir);
    case 'anno': return addYears(anchor, dir);
    default: return anchor;
  }
}

/**
 * The period just before, of the same kind (previous month, previous year…), with
 * the words to compare against it: "rispetto ad agosto", "al 2025", "alla settimana prima".
 */
export function previousPeriod(mode: PeriodMode, from: Date, to: Date): { from: Date; to: Date; vs: string } {
  switch (mode) {
    case 'giorno': {
      const d = subDays(from, 1);
      return { from: d, to: d, vs: 'al giorno prima' };
    }
    case 'settimana':
      return { from: subDays(from, 7), to: subDays(to, 7), vs: 'alla settimana prima' };
    case 'mese': {
      const m = subMonths(from, 1);
      const name = format(m, 'MMMM', { locale: it });
      return { from: startOfMonth(m), to: endOfMonth(m), vs: `${/^[aeiou]/.test(name) ? 'ad' : 'a'} ${name}` };
    }
    case 'anno': {
      const y = subYears(from, 1);
      return { from: startOfYear(y), to: endOfYear(y), vs: `al ${format(y, 'yyyy')}` };
    }
    case 'periodo': {
      const days = differenceInCalendarDays(to, from) + 1;
      return { from: subDays(from, days), to: subDays(from, 1), vs: 'al periodo prima' };
    }
  }
}

export interface TimeSlot { key: string; label: string; title: string }

/** Chart columns: days for short periods, months otherwise. None for a single day. */
export function timeSlots(mode: PeriodMode, from: Date, to: Date): { slots: TimeSlot[]; keyOf: (date: string) => string } {
  if (mode === 'giorno') return { slots: [], keyOf: d => d };
  const byMonth = mode === 'anno' || differenceInCalendarDays(to, from) > 62;
  if (byMonth) {
    const spansYears = from.getFullYear() !== to.getFullYear();
    return {
      slots: eachMonthOfInterval({ start: from, end: to }).map(m => ({
        key: format(m, 'yyyy-MM'),
        label: format(m, spansYears ? 'MMM yy' : 'MMM', { locale: it }),
        title: capitalize(format(m, 'MMMM yyyy', { locale: it })),
      })),
      keyOf: d => d.slice(0, 7),
    };
  }
  return {
    slots: eachDayOfInterval({ start: from, end: to }).map(d => ({
      key: ymd(d),
      label: mode === 'settimana' ? format(d, 'EEE d', { locale: it }) : mode === 'mese' ? format(d, 'd') : format(d, 'd/M'),
      title: capitalize(format(d, 'EEEE d MMMM', { locale: it })),
    })),
    keyOf: d => d,
  };
}
