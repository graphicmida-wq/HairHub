/**
 * WhatsApp appointment reminders, sent by hand: Lumii opens the chat with the
 * client's number and the message already written, the user presses send.
 * No WhatsApp account is connected to Lumii, so nothing can be sent on its own.
 */

import { addDays, format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import {
  getListAppointmentsQueryKey,
  useSetAppointmentReminders,
  type Appointment,
  type Client,
  type SalonSettings,
  type Service,
  type StaffMember,
} from '@workspace/api-client-react';
import { toast } from '../components/Toast';

export const DEFAULT_REMINDER_TEMPLATE =
  'Ciao {nome}! 😊 Ti ricordiamo il tuo appuntamento da {salone} {quando} alle {ora}. Se hai un imprevisto avvisaci, grazie! A presto';

export const REMINDER_MAX_LENGTH = 1000;

/** Words the salon can put in the text; Lumii replaces them for each client */
export const REMINDER_FIELDS = [
  { key: 'nome', example: 'Maria' },
  { key: 'quando', example: 'domani' },
  { key: 'ora', example: '09:00' },
  { key: 'servizio', example: 'Piega' },
  { key: 'operatrice', example: 'Sara' },
  { key: 'salone', example: 'il nome del salone' },
] as const;

export type ReminderKey = (typeof REMINDER_FIELDS)[number]['key'];
export type ReminderValues = Record<ReminderKey, string>;

export function fillReminder(template: string, values: ReminderValues): string {
  return template
    .replace(/\{(\w+)\}/g, (match, key: string) => {
      const k = key.toLowerCase();
      return k in values ? values[k as ReminderKey] : match;
    })
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** "oggi", "domani" or "lunedì 12 ottobre", as seen from the moment the message is written */
export function whenLabel(date: string, now = new Date()): string {
  const d = new Date(date + 'T12:00:00');
  if (isSameDay(d, now)) return 'oggi';
  if (isSameDay(d, addDays(now, 1))) return 'domani';
  return format(d, 'EEEE d MMMM', { locale: it });
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

// ── Phone numbers ────────────────────────────────────────────────────────────

export type WhatsAppNumber =
  | { kind: 'ok'; digits: string }
  | { kind: 'missing' }
  | { kind: 'invalid' };

/** One number as typed in the client card → international digits ("39…"), or null */
function normalizeOne(part: string): string | null {
  const trimmed = part.trim();
  let d = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+') || d.startsWith('00')) {
    if (d.startsWith('00')) d = d.slice(2);
    return d.length >= 8 && d.length <= 15 && d[0] !== '0' ? d : null;
  }
  // Already with the Italian prefix: 39 + a 10-digit mobile
  if (d.length === 12 && d.startsWith('393')) return d;
  // Italian mobile (3…, 10 digits or an old 9-digit one) or landline (0…)
  if (d.startsWith('3') && (d.length === 10 || d.length === 9)) return '39' + d;
  if (d.startsWith('0') && d.length >= 6 && d.length <= 11) return '39' + d;
  return null;
}

/**
 * The client's number for WhatsApp. The field is free text: it can be empty or
 * "-", or hold two numbers ("333… - 0522…"); then a mobile wins over a landline.
 */
export function whatsappNumber(raw: string | null | undefined): WhatsAppNumber {
  const text = (raw ?? '').trim();
  if (!/\d/.test(text)) return { kind: 'missing' };
  const parts = text.split(/\s[-–/]\s|[/,;|]|\s{2,}|\s+(?:e|o|oppure)\s+/i).filter(p => /\d/.test(p));
  const found = parts.map(normalizeOne).filter((d): d is string => d !== null);
  if (found.length === 0) {
    const whole = normalizeOne(text);
    return whole ? { kind: 'ok', digits: whole } : { kind: 'invalid' };
  }
  return { kind: 'ok', digits: found.find(d => d.startsWith('393')) ?? found[0] };
}

// ── Opening WhatsApp ─────────────────────────────────────────────────────────

export type DesktopOpener = 'app' | 'web';
const OPENER_KEY = 'lumii-whatsapp-desktop';

/** On a computer: the installed WhatsApp app (default) or WhatsApp Web, chosen per device */
export function loadDesktopOpener(): DesktopOpener {
  try {
    return localStorage.getItem(OPENER_KEY) === 'web' ? 'web' : 'app';
  } catch {
    return 'app';
  }
}

export function saveDesktopOpener(value: DesktopOpener) {
  try {
    localStorage.setItem(OPENER_KEY, value);
  } catch {
    /* private mode: the default stays */
  }
}

export function isPhoneOrTablet(): boolean {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return true;
  // iPadOS presents itself as a Mac
  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

/** Link that opens the chat with the message already written (it still has to be sent by hand) */
export function whatsappLink(digits: string, text: string): { href: string; newTab: boolean } {
  const msg = encodeURIComponent(text);
  if (isPhoneOrTablet()) return { href: `https://wa.me/${digits}?text=${msg}`, newTab: true };
  return loadDesktopOpener() === 'web'
    ? { href: `https://web.whatsapp.com/send?phone=${digits}&text=${msg}`, newTab: true }
    : { href: `whatsapp://send?phone=${digits}&text=${msg}`, newTab: false };
}

// ── One reminder ─────────────────────────────────────────────────────────────

export interface Reminder {
  client: Client | undefined;
  /** The client's appointments it covers (one visit, possibly booked as two) */
  appointments: Appointment[];
  number: WhatsAppNumber;
  message: string;
  /** Latest "sent" mark among the appointments, null if none */
  sentAt: string | null;
}

export function buildReminder(
  group: Appointment[],
  ctx: { clients: Client[]; services: Service[]; staff: StaffMember[]; settings: SalonSettings | undefined },
): Reminder {
  const sorted = [...group].sort((a, b) => a.time.localeCompare(b.time));
  const first = sorted[0];
  const client = ctx.clients.find(c => c.id === first.clientId);
  const serviceNames = [...new Set(sorted.flatMap(a => a.serviceIds))]
    .map(id => ctx.services.find(s => s.id === id)?.name)
    .filter((n): n is string => !!n);
  const staffNames = [...new Set(sorted.map(a => ctx.staff.find(m => m.id === a.staffId)?.name).filter((n): n is string => !!n))];
  const template = ctx.settings?.reminderTemplate?.trim() || DEFAULT_REMINDER_TEMPLATE;
  const message = fillReminder(template, {
    nome: client?.firstName.trim() ?? '',
    quando: whenLabel(first.date),
    ora: first.time,
    servizio: joinNames(serviceNames),
    operatrice: joinNames(staffNames),
    salone: ctx.settings?.salonName ?? '',
  });
  const marks = sorted.map(a => a.reminderSentAt).filter((s): s is string => !!s).sort();
  return {
    client,
    appointments: sorted,
    number: whatsappNumber(client?.phone),
    message,
    sentAt: marks.length ? marks[marks.length - 1] : null,
  };
}

/** Records (or clears) the "reminder sent" mark and refreshes the agenda */
export function useReminderMark() {
  const queryClient = useQueryClient();
  return useSetAppointmentReminders({
    mutation: {
      onSuccess: updated => {
        queryClient.setQueryData<Appointment[]>(getListAppointmentsQueryKey(), list =>
          list?.map(a => updated.find(u => u.id === a.id) ?? a),
        );
        queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey() });
      },
      onError: () => toast.show('Non sono riuscito a segnare il promemoria, riprova', 'error'),
    },
  });
}

export function sentLabel(sentAt: string): string {
  const d = new Date(sentAt);
  return isSameDay(d, new Date())
    ? `oggi alle ${format(d, 'HH:mm')}`
    : format(d, "EEE d MMM 'alle' HH:mm", { locale: it });
}
