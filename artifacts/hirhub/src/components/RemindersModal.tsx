import React, { useEffect, useMemo, useState } from 'react';
import { addDays, format, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { Cake, CalendarCheck, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import {
  useGetSettings,
  useListAppointments,
  useListClients,
  useListServices,
  useListStaff,
  type Appointment,
} from '@workspace/api-client-react';
import { Modal } from './Modal';
import { ReminderLink, ReminderNumberProblem, ReminderSentNote } from './Reminder';
import { buildReminder, whenLabel } from '../lib/whatsapp';
import { useAuth } from '../lib/auth-context';
import { cn } from '../lib/utils';
import { BirthdayReminders, useUpcomingBirthdays } from './BirthdayReminders';

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Promemoria → Appuntamenti: the bookings of one day (tomorrow by default), one
 * row per client, to send the WhatsApp reminders one after the other.
 */
const AppointmentReminders = () => {
  const [day, setDay] = useState(() => ymd(addDays(new Date(), 1)));

  const { data: appointments = [] } = useListAppointments();
  const { data: clients = [] } = useListClients();
  const { data: services = [] } = useListServices();
  const { data: staff = [] } = useListStaff();
  const { data: settings } = useGetSettings();

  const booked = useMemo(() => appointments.filter(a => a.status === 'prenotato'), [appointments]);

  // A client with two bookings the same day gets one message, for the first one
  const reminders = useMemo(() => {
    const byClient = new Map<string, Appointment[]>();
    for (const a of booked) {
      if (a.date === day) byClient.set(a.clientId, [...(byClient.get(a.clientId) ?? []), a]);
    }
    return [...byClient.values()]
      .map(group => buildReminder(group, { clients, services, staff, settings }))
      .sort((a, b) => a.appointments[0].time.localeCompare(b.appointments[0].time));
  }, [booked, day, clients, services, staff, settings]);

  const nextDay = useMemo(() => booked.map(a => a.date).filter(d => d > day).sort()[0], [booked, day]);

  const today = ymd(new Date());
  const when = whenLabel(day);
  const fullDate = format(new Date(day + 'T12:00:00'), 'EEEE d MMMM', { locale: it });
  const dayTitle = when === 'oggi' || when === 'domani' ? `${capitalize(when)} · ${fullDate}` : capitalize(fullDate);

  const toSend = reminders.filter(r => !r.sentAt && r.number.kind === 'ok').length;
  const sent = reminders.filter(r => r.sentAt).length;
  const noNumber = reminders.filter(r => !r.sentAt && r.number.kind !== 'ok').length;

  const navButton = 'p-2 text-stone-400 hover:text-stone-900 active:bg-stone-100 rounded-full transition-colors shrink-0 disabled:opacity-30 disabled:hover:text-stone-400';

  return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1 -mx-2">
          <button
            type="button"
            onClick={() => setDay(ymd(subDays(new Date(day + 'T12:00:00'), 1)))}
            disabled={day <= today}
            aria-label="Giorno prima"
            className={navButton}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="flex-1 text-center font-serif text-lg text-stone-900 truncate">{dayTitle}</p>
          <button
            type="button"
            onClick={() => setDay(ymd(addDays(new Date(day + 'T12:00:00'), 1)))}
            aria-label="Giorno dopo"
            className={navButton}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {reminders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CalendarCheck className="w-8 h-8 text-stone-300" />
            <p className="text-stone-500">Nessun appuntamento da ricordare.</p>
            {nextDay && (
              <button
                type="button"
                onClick={() => setDay(nextDay)}
                className="text-sm font-medium text-stone-700 hover:text-stone-900 underline underline-offset-2"
              >
                Vai al prossimo giorno con appuntamenti ({whenLabel(nextDay)})
              </button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-stone-100 border-y border-stone-100">
            {reminders.map(r => {
              const first = r.appointments[0];
              const serviceNames = [...new Set(r.appointments.flatMap(a => a.serviceIds))]
                .map(id => services.find(s => s.id === id)?.name)
                .filter(Boolean);
              const staffName = staff.find(m => m.id === first.staffId)?.name;
              const details = [serviceNames.join(', '), staffName].filter(Boolean).join(' · ');
              return (
                <li key={first.id} className="py-3 grid grid-cols-[3rem_minmax(0,1fr)_auto] gap-x-3 items-start">
                  <span className="font-semibold text-stone-900 tabular-nums pt-0.5">{first.time}</span>
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <p className="font-medium text-stone-900 truncate">
                      {r.client ? `${r.client.firstName} ${r.client.lastName}`.trim() : 'Cliente'}
                    </p>
                    {details && <p className="text-sm text-stone-500 truncate">{details}</p>}
                  </div>
                  {r.number.kind === 'ok' ? (
                    <ReminderLink reminder={r} className="whitespace-nowrap px-3 py-2 text-sm">
                      {r.sentAt ? (
                        <>
                          <span className="sm:hidden">Di nuovo</span>
                          <span className="hidden sm:inline">Invia di nuovo</span>
                        </>
                      ) : 'Invia'}
                    </ReminderLink>
                  ) : <span />}
                  {/* Status on its own line, as wide as name and button together */}
                  {(r.sentAt || r.number.kind !== 'ok') && (
                    <div className="col-start-2 col-span-2 mt-1">
                      {r.sentAt ? <ReminderSentNote reminder={r} /> : <ReminderNumberProblem reminder={r} />}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {reminders.length > 0 && (
          <p className="text-sm text-stone-600">
            {[
              `${toSend} da inviare`,
              `${sent} ${sent === 1 ? 'inviato' : 'inviati'}`,
              noNumber > 0 ? `${noNumber} senza numero valido` : null,
            ].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="text-sm text-stone-500">
          WhatsApp si apre con il messaggio già scritto: controllalo e premi invio.
        </p>
      </div>
  );
};

export type RemindersTab = 'appuntamenti' | 'compleanni';

/** The WhatsApp messages to send by hand: appointment reminders and birthday wishes */
export const RemindersModal = ({
  isOpen,
  onClose,
  initialTab = 'appuntamenti',
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: RemindersTab;
}) => {
  const { can } = useAuth();
  const tabs = ([
    can('agenda') && { key: 'appuntamenti' as const, label: 'Appuntamenti', icon: MessageCircle },
    can('clienti') && { key: 'compleanni' as const, label: 'Compleanni', icon: Cake },
  ].filter(Boolean)) as { key: RemindersTab; label: string; icon: typeof Cake }[];
  const [tab, setTab] = useState<RemindersTab>(initialTab);
  useEffect(() => {
    if (isOpen) setTab(tabs.some(t => t.key === initialTab) ? initialTab : tabs[0]?.key ?? 'appuntamenti');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialTab]);
  const birthdaysToSend = useUpcomingBirthdays().filter(b => !b.greeted && b.number.kind === 'ok').length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Promemoria WhatsApp">
      <div className="flex flex-col gap-4">
        {tabs.length > 1 && (
          <div role="tablist" className="flex bg-stone-100 rounded-lg p-0.5">
            {tabs.map(t => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  tab === t.key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800',
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                {t.key === 'compleanni' && birthdaysToSend > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-pink-500 text-white text-xs font-semibold flex items-center justify-center">
                    {birthdaysToSend}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {tab === 'compleanni' ? <BirthdayReminders /> : <AppointmentReminders />}
      </div>
    </Modal>
  );
};
