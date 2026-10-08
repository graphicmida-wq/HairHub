/**
 * Clients' birthdays: who has one coming up, the WhatsApp wishes (sent by hand,
 * like the appointment reminders) and the birthday promotion promised in them.
 * A birthday is stored as "1990-05-15", or "--05-15" when the year isn't known.
 */

import { addDays, format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListClientsQueryKey,
  useSetClientBirthdayGreeting,
  useSetClientBirthdayPromoUsed,
  type Client,
  type SalonSettings,
} from '@workspace/api-client-react';
import { toast } from '../components/Toast';
import { fillTemplate, whatsappNumber, type WhatsAppNumber } from './whatsapp';

export interface Birthday {
  day: number;
  /** 1–12 */
  month: number;
  year: number | null;
}

export const MONTHS = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre',
];

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

export function daysInMonth(month: number, year: number | null): number {
  // Without a year, 29 February is allowed
  return new Date(year ?? 2000, month, 0).getDate();
}

export function parseBirthday(dob: string | null | undefined): Birthday | null {
  const m = /^(?:(\d{4})|-)-(\d{2})-(\d{2})$/.exec((dob ?? '').trim());
  if (!m) return null;
  const year = m[1] && Number(m[1]) >= 1900 ? Number(m[1]) : null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month, year)) return null;
  return { day, month, year };
}

export function serializeBirthday(b: Birthday): string {
  return `${b.year ? String(b.year) : '-'}-${pad(b.month)}-${pad(b.day)}`;
}

/** "15 maggio 1990" or "15 maggio" */
export function formatBirthday(b: Birthday): string {
  return `${b.day} ${MONTHS[b.month - 1]}${b.year ? ` ${b.year}` : ''}`;
}

/** The birthday in a given year (29 February falls on the 28th in other years) */
function occurrence(b: Birthday, year: number): Date {
  return new Date(year, b.month - 1, Math.min(b.day, daysInMonth(b.month, year)), 12);
}

export function ageOn(b: Birthday, date: Date): number | null {
  return b.year ? date.getFullYear() - b.year : null;
}

// ── Coming up ────────────────────────────────────────────────────────────────

/** Window of the birthday list: the next 7 days, plus the last 3 if the wishes haven't gone out yet */
export const DAYS_AHEAD = 7;
export const DAYS_BEHIND = 3;

export interface UpcomingBirthday {
  client: Client;
  birthday: Birthday;
  /** The birthday this time round, YYYY-MM-DD */
  date: string;
  /** Days from today: 0 = today, 1 = tomorrow, -1 = yesterday */
  offset: number;
  age: number | null;
  greeted: boolean;
  number: WhatsAppNumber;
}

const dayDiff = (a: Date, b: Date) =>
  Math.round((new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() - new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()) / 86400000);

/** Wishes count for this birthday if they were sent at most a week before it (last year's don't) */
export function greetedFor(client: Client, date: string): boolean {
  if (!client.birthdayGreetedAt) return false;
  return dayDiff(new Date(client.birthdayGreetedAt), parseISO(date)) >= -(DAYS_AHEAD + 1);
}

export function upcomingBirthdays(clients: Client[], today = new Date()): UpcomingBirthday[] {
  const out: UpcomingBirthday[] = [];
  for (const client of clients) {
    const birthday = parseBirthday(client.dob);
    if (!birthday) continue;
    for (const year of [today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1]) {
      const when = occurrence(birthday, year);
      const offset = dayDiff(when, today);
      if (offset < -DAYS_BEHIND || offset > DAYS_AHEAD) continue;
      const date = ymd(when);
      const greeted = greetedFor(client, date);
      if (offset < 0 && greeted) continue;
      out.push({ client, birthday, date, offset, age: ageOn(birthday, when), greeted, number: whatsappNumber(client.phone) });
    }
  }
  return out.sort((a, b) => a.offset - b.offset || a.client.firstName.localeCompare(b.client.firstName, 'it'));
}

/** "Oggi", "Domani", "Sabato 10 ottobre" (past days: "Lunedì 5 ottobre") */
export function dayLabel(date: string, offset: number): string {
  if (offset === 0) return 'Oggi';
  if (offset === 1) return 'Domani';
  if (offset === -1) return 'Ieri';
  const s = format(parseISO(date), 'EEEE d MMMM', { locale: it });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── The message ──────────────────────────────────────────────────────────────

export const DEFAULT_BIRTHDAY_PROMO_DAYS = 30;
export const BIRTHDAY_PROMO_MAX_LENGTH = 300;

export const DEFAULT_BIRTHDAY_TEMPLATE_PROMO =
  'Tanti auguri {nome}! 🎉 Per il tuo compleanno {salone} ti regala {promozione}, da usare entro il {scadenza}. A presto!';
export const DEFAULT_BIRTHDAY_TEMPLATE_PLAIN =
  'Tanti auguri {nome}! 🎉 Tutto lo staff di {salone} ti augura un felicissimo compleanno. A presto!';

export const BIRTHDAY_FIELDS = ['nome', 'salone', 'promozione', 'scadenza'] as const;

export function defaultBirthdayTemplate(promo: string | null | undefined): string {
  return promo?.trim() ? DEFAULT_BIRTHDAY_TEMPLATE_PROMO : DEFAULT_BIRTHDAY_TEMPLATE_PLAIN;
}

export function promoDays(settings: SalonSettings | undefined): number {
  return settings?.birthdayPromoDays ?? DEFAULT_BIRTHDAY_PROMO_DAYS;
}

/** Last day the promotion holds, counted from the birthday */
export function promoUntil(date: string, days: number): string {
  return ymd(addDays(parseISO(date), days));
}

export const shortDate = (date: string) => format(parseISO(date), 'd MMMM', { locale: it });

export function birthdayMessage(
  client: Client,
  date: string,
  settings: SalonSettings | undefined,
  overrides?: { template?: string; promo?: string | null; days?: number },
): string {
  const promo = (overrides?.promo !== undefined ? overrides.promo : settings?.birthdayPromo)?.trim() ?? '';
  const days = overrides?.days ?? promoDays(settings);
  const template = overrides?.template?.trim() || settings?.birthdayTemplate?.trim() || defaultBirthdayTemplate(promo);
  return fillTemplate(template, {
    nome: client.firstName.trim(),
    salone: settings?.salonName ?? '',
    promozione: promo,
    scadenza: shortDate(promoUntil(date, days)),
  });
}

// ── The promotion when the client comes back ─────────────────────────────────

export interface ActivePromo {
  promo: string;
  until: string;
  usedAt: string | null;
}

/** The birthday promotion that applies to a visit on `date`, if any */
export function promoFor(client: Client | undefined, date: string): ActivePromo | null {
  if (!client?.birthdayPromo || !client.birthdayPromoUntil || !client.birthdayGreetedAt) return null;
  if (date > client.birthdayPromoUntil || date < ymd(new Date(client.birthdayGreetedAt))) return null;
  return { promo: client.birthdayPromo, until: client.birthdayPromoUntil, usedAt: client.birthdayPromoUsedAt ?? null };
}

// ── Saving the marks ─────────────────────────────────────────────────────────

function useClientUpdate() {
  const queryClient = useQueryClient();
  return (updated: Client) => {
    queryClient.setQueryData<Client[]>(getListClientsQueryKey(), list => list?.map(c => (c.id === updated.id ? updated : c)));
    queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
  };
}

export function useBirthdayMark() {
  const apply = useClientUpdate();
  return useSetClientBirthdayGreeting({
    mutation: {
      onSuccess: apply,
      onError: () => toast.show('Non sono riuscito a segnare gli auguri, riprova', 'error'),
    },
  });
}

export function usePromoUsedMark() {
  const apply = useClientUpdate();
  return useSetClientBirthdayPromoUsed({
    mutation: {
      onSuccess: apply,
      onError: () => toast.show('Non sono riuscito a segnare la promozione, riprova', 'error'),
    },
  });
}
