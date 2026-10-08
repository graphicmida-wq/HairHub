import React, { useMemo } from 'react';
import { Cake } from 'lucide-react';
import { useGetSettings, useListClients } from '@workspace/api-client-react';
import { useAuth } from '../lib/auth-context';
import {
  birthdayMessage,
  dayLabel,
  parseBirthday,
  promoDays,
  shortDate,
  upcomingBirthdays,
  useBirthdayMark,
  type UpcomingBirthday,
} from '../lib/birthdays';
import { NumberProblem, SentNote, WhatsAppLink } from './Reminder';

export function useUpcomingBirthdays() {
  const { data: clients = [] } = useListClients();
  return useMemo(() => upcomingBirthdays(clients), [clients]);
}

export const ageLine = (b: UpcomingBirthday) =>
  b.age == null ? '' : b.offset < 0 ? `ha compiuto ${b.age} anni` : `compie ${b.age} anni`;

/** Promemoria → Compleanni: the next 7 days (and the last 3 still without wishes), grouped by day */
export const BirthdayReminders = () => {
  const { data: clients = [] } = useListClients();
  const { data: settings } = useGetSettings();
  const { isAdmin } = useAuth();
  const mark = useBirthdayMark();
  const list = useUpcomingBirthdays();
  const withoutDob = clients.filter(c => !parseBirthday(c.dob)).length;

  const groups = useMemo(() => {
    const byDate = new Map<string, UpcomingBirthday[]>();
    for (const b of list) byDate.set(b.date, [...(byDate.get(b.date) ?? []), b]);
    return [...byDate.entries()];
  }, [list]);

  const promo = settings?.birthdayPromo?.trim();

  return (
    <div className="flex flex-col gap-4">
      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Cake className="w-8 h-8 text-stone-300" />
          <p className="text-stone-500">Nessun compleanno nei prossimi 7 giorni.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(([date, items]) => (
            <section key={date}>
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">
                {dayLabel(date, items[0].offset)}
                {items[0].offset < 0 && <span className="normal-case tracking-normal font-normal"> · auguri non ancora mandati</span>}
              </p>
              <ul className="flex flex-col divide-y divide-stone-100 border-y border-stone-100">
                {items.map(b => {
                  const name = `${b.client.firstName} ${b.client.lastName}`.trim();
                  const sentAt = b.greeted ? b.client.birthdayGreetedAt : null;
                  return (
                    <li key={b.client.id} className="py-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-start">
                      <div className="min-w-0 flex flex-col gap-0.5">
                        <p className="font-medium text-stone-900 truncate flex items-center gap-1.5">
                          <Cake className="w-4 h-4 shrink-0 text-pink-500" />
                          {name}
                        </p>
                        {ageLine(b) && <p className="text-sm text-stone-500">{ageLine(b)}</p>}
                      </div>
                      {b.number.kind === 'ok' ? (
                        <WhatsAppLink
                          digits={b.number.digits}
                          message={birthdayMessage(b.client, b.date, settings)}
                          onOpen={() => mark.mutate({ data: { clientId: b.client.id, sent: true, birthday: b.date } })}
                          className="whitespace-nowrap px-3 py-2 text-sm"
                        >
                          {sentAt ? 'Di nuovo' : 'Auguri'}
                        </WhatsAppLink>
                      ) : <span />}
                      {(sentAt || b.number.kind !== 'ok') && (
                        <div className="col-span-2 mt-1 flex flex-col gap-0.5">
                          {sentAt ? (
                            <>
                              <SentNote
                                sentAt={sentAt}
                                pending={mark.isPending}
                                onUndo={() => mark.mutate({ data: { clientId: b.client.id, sent: false } })}
                              />
                              {b.client.birthdayPromo && b.client.birthdayPromoUntil && (
                                <span className="text-sm text-stone-500">
                                  Promozione: {b.client.birthdayPromo}, entro il {shortDate(b.client.birthdayPromoUntil)}
                                </span>
                              )}
                            </>
                          ) : (
                            <NumberProblem number={b.number} phone={b.client.phone} />
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 text-sm text-stone-500">
        <p>
          {promo
            ? <>Promozione: <span className="text-stone-700">{promo}</span>, da usare entro {promoDays(settings)} giorni dal compleanno.</>
            : 'Nessuna promozione di compleanno.'}
          {isAdmin && ' Si cambia in Impostazioni → Auguri di compleanno.'}
        </p>
        {withoutDob > 0 && (
          <p>{withoutDob} {withoutDob === 1 ? 'cliente non ha' : 'clienti non hanno'} la data di nascita: si aggiunge dalla scheda della cliente.</p>
        )}
      </div>
    </div>
  );
};
