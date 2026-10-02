import React, { useRef } from 'react';
import { format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Plus, ChevronRight } from 'lucide-react';
import type { Appointment, Client, Service, StaffMember } from '@workspace/api-client-react';
import { cn, computeCalendarLayout, calendarHours, addMinsToTime } from '../lib/utils';
import { AppointmentBlock, type BlockInteraction } from './AppointmentBlock';
import { useFontScale } from '../lib/font-scale';

interface WeekViewProps {
  weekDays: Date[];
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  staff?: StaffMember[];
  staffFilter?: string | null;
  interaction: BlockInteraction;
  /** Rows of the phone list open the appointment directly */
  onAppointmentOpen: (id: string) => void;
  onSlotClick: (date: string, time: string) => void;
  onDayClick: (day: Date) => void;
}

/** Height of one hour at the normal text size; it grows with the text size setting */
const HOUR_H = 96;

/** Week grid on large screens; on phones and portrait tablets a list grouped by day. Rendered inside the agenda's surface. */
export const WeekView = ({
  weekDays,
  appointments,
  clients,
  services,
  staff = [],
  staffFilter = null,
  interaction,
  onAppointmentOpen,
  onSlotClick,
  onDayClick,
}: WeekViewProps) => {
  const scale = useFontScale();
  const hourH = Math.round(HOUR_H * scale);
  const today = new Date();
  const headerScrollRef = useRef<HTMLDivElement>(null);

  const dayStrings = weekDays.map(d => format(d, 'yyyy-MM-dd'));
  const weekApps = appointments.filter(a =>
    dayStrings.includes(a.date) && (!staffFilter || a.staffId === staffFilter)
  );
  const { startHour, endHour } = calendarHours(weekApps);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => `${String(startHour + i).padStart(2, '0')}:00`);
  const totalH = hours.length * hourH;

  const dayColClass = 'flex-1 min-w-[6.25rem] border-l border-stone-100 first:border-l-0';

  return (
    <>
      {/* ── Grid (large screens) ───────────────────────────────────────── */}
      <div className="hidden lg:block">
        <div className="flex border-b border-stone-100 sticky -top-8 bg-white z-10">
          <div className="w-14 shrink-0" />
          <div ref={headerScrollRef} className="flex flex-1 overflow-hidden">
            {weekDays.map(day => {
              const isToday = isSameDay(day, today);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => onDayClick(day)}
                  className={cn(dayColClass, 'text-center py-2 px-1 hover:bg-stone-50 transition-colors')}
                >
                  <p className={cn('text-[0.625rem] font-semibold uppercase tracking-wider', isToday ? 'text-brand-dark' : 'text-stone-400')}>
                    {format(day, 'EEE', { locale: it })}
                  </p>
                  <p className={cn('text-sm font-medium mt-0.5', isToday
                    ? 'w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center mx-auto'
                    : 'text-stone-700')}>
                    {format(day, 'd')}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex pt-3 pb-2">
          <div className="w-14 shrink-0 relative" style={{ height: totalH }}>
            {hours.map((hour, i) => (
              <div key={hour} className="absolute right-2" style={{ top: i * hourH + 4 * scale }}>
                <span className="text-[0.625rem] font-medium text-stone-400 leading-none">{hour}</span>
              </div>
            ))}
          </div>

          <div
            onScroll={e => { if (headerScrollRef.current) headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft; }}
            className="flex flex-1 overflow-x-auto no-scrollbar isolate"
          >
            {weekDays.map((day, d) => {
              const dateStr = dayStrings[d];
              const layout = computeCalendarLayout(
                weekApps.filter(a => a.date === dateStr), startHour, hourH, { minH: 18 * scale, headerPx: 26 * scale },
              );
              return (
                <div key={dateStr} className={cn(dayColClass, 'relative')} style={{ height: totalH }}>
                  {hours.map((hour, i) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-b border-stone-50 hover:bg-stone-50/60 transition-colors cursor-pointer group"
                      style={{ top: i * hourH, height: hourH }}
                      onClick={() => onSlotClick(dateStr, hour)}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Plus className="w-3 h-3 text-stone-300" />
                      </div>
                    </div>
                  ))}
                  {layout.map(box => (
                    <AppointmentBlock
                      key={box.item.id}
                      box={box}
                      clients={clients}
                      services={services}
                      interaction={interaction}
                      compact
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── List grouped by day (phones, portrait tablets) ─────────────── */}
      <div className="lg:hidden">
        {weekDays.map((day, d) => {
          const dayApps = weekApps
            .filter(a => a.date === dayStrings[d])
            .sort((a, b) => a.time.localeCompare(b.time));
          const isToday = isSameDay(day, today);
          return (
            <section key={dayStrings[d]} className="border-b border-stone-100 last:border-b-0">
              <button
                onClick={() => onDayClick(day)}
                className="w-full flex items-center justify-between px-4 py-2.5 border-b border-stone-100 bg-stone-50 active:bg-stone-100 sticky -top-6 md:-top-8 z-10"
              >
                <span className="flex items-baseline gap-2">
                  <span className={cn('text-xs font-semibold uppercase tracking-wider', isToday ? 'text-brand-dark' : 'text-stone-500')}>
                    {format(day, 'EEE d MMM', { locale: it })}
                  </span>
                  {isToday && <span className="text-[0.625rem] font-semibold text-white bg-stone-900 px-1.5 py-0.5 rounded-full">Oggi</span>}
                </span>
                <span className="flex items-center gap-1 text-xs text-stone-400">
                  {dayApps.length === 0 ? 'Nessun appuntamento' : `${dayApps.length} appuntament${dayApps.length === 1 ? 'o' : 'i'}`}
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>
              {dayApps.map(app => {
                const client = clients.find(c => c.id === app.clientId);
                const member = staff.find(m => m.id === app.staffId);
                const appServices = app.serviceIds.map(sid => services.find(s => s.id === sid)).filter(Boolean) as Service[];
                const isCancelled = app.status === 'annullato';
                const isMuted = isCancelled || app.status === 'no-show' || app.status === 'completato';
                return (
                  <button
                    key={app.id}
                    onClick={() => onAppointmentOpen(app.id)}
                    className={cn(
                      'w-full flex items-stretch gap-3 px-4 py-2.5 text-left border-b border-stone-50 last:border-b-0 active:bg-stone-50',
                      isMuted && 'opacity-60',
                    )}
                  >
                    <span className="w-[4.625rem] shrink-0 text-xs font-semibold text-stone-800 tabular-nums pt-0.5">
                      {app.time}
                      <span className="block font-normal text-stone-400">{addMinsToTime(app.time, app.durationMins)}</span>
                    </span>
                    <span className="w-1 rounded-full shrink-0" style={{ backgroundColor: appServices[0]?.color ?? '#94a3b8' }} />
                    <span className="flex-1 min-w-0">
                      <span className={cn('block text-sm font-semibold text-stone-900 truncate', isCancelled && 'line-through')}>
                        {client ? `${client.firstName} ${client.lastName}` : '(Senza nome)'}
                      </span>
                      <span className="block text-xs text-stone-500 truncate">
                        {appServices.map(s => s.name).join(' · ') || 'Servizio da inserire'}
                      </span>
                    </span>
                    <span className="shrink-0 flex items-center gap-1 text-[0.6875rem] text-stone-500 self-center">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: member?.color ?? '#94a3b8' }} />
                      {member?.name ?? '—'}
                    </span>
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
};
