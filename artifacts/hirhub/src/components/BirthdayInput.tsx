import React, { useEffect, useState } from 'react';
import { MONTHS, daysInMonth, parseBirthday, serializeBirthday } from '../lib/birthdays';

const THIS_YEAR = new Date().getFullYear();

function toValue(day: string, month: string, year: string): string {
  const d = Number(day);
  const m = Number(month);
  if (!d || !m) return '';
  const y = /^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= THIS_YEAR ? Number(year) : null;
  if (d > daysInMonth(m, y)) return '';
  return serializeBirthday({ day: d, month: m, year: y });
}

/**
 * Birthday as day + month, the year is optional (many clients give the date but
 * not the year). Value: "1990-05-15", "--05-15" without year, or "" if incomplete.
 */
export const BirthdayInput = ({
  value,
  onChange,
  inputClass,
}: {
  value: string;
  onChange: (value: string) => void;
  inputClass: string;
}) => {
  const initial = parseBirthday(value);
  const [day, setDay] = useState(initial ? String(initial.day) : '');
  const [month, setMonth] = useState(initial ? String(initial.month) : '');
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '');

  // Follow changes from outside (form reset, another client)
  useEffect(() => {
    if ((value ?? '') === toValue(day, month, year)) return;
    const b = parseBirthday(value);
    setDay(b ? String(b.day) : '');
    setMonth(b ? String(b.month) : '');
    setYear(b?.year ? String(b.year) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const update = (d: string, m: string, y: string) => {
    setDay(d);
    setMonth(m);
    setYear(y);
    onChange(toValue(d, m, y));
  };

  const yearOk = year === '' || (/^\d{4}$/.test(year) && Number(year) >= 1900 && Number(year) <= THIS_YEAR);
  const tooManyDays = !!day && !!month && Number(day) > daysInMonth(Number(month), yearOk && year ? Number(year) : null);

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-[5.75rem_minmax(0,1fr)] sm:grid-cols-[6.25rem_minmax(0,1fr)_5rem] gap-2">
        <select aria-label="Giorno" value={day} onChange={e => update(e.target.value, month, year)} className={inputClass}>
          <option value="">Giorno</option>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i + 1} value={String(i + 1)}>{i + 1}</option>
          ))}
        </select>
        <select aria-label="Mese" value={month} onChange={e => update(day, e.target.value, year)} className={inputClass}>
          <option value="">Mese</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1)}>{name}</option>
          ))}
        </select>
        <input
          aria-label="Anno (facoltativo)"
          inputMode="numeric"
          placeholder="Anno"
          value={year}
          onChange={e => update(day, month, e.target.value.replace(/\D/g, '').slice(0, 4))}
          className={inputClass}
        />
      </div>
      {(day && !month) || (!day && month) ? (
        <p className="text-xs text-stone-500">Scegli sia il giorno sia il mese.</p>
      ) : tooManyDays ? (
        <p className="text-xs text-amber-700">{MONTHS[Number(month) - 1]} non ha {day} giorni.</p>
      ) : !yearOk && year.length === 4 ? (
        <p className="text-xs text-amber-700">Anno non valido: viene salvato solo giorno e mese.</p>
      ) : null}
    </div>
  );
};
