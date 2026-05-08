import React, { useRef } from 'react';
import { format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { cn, hexAlpha, computeCalendarLayout, addMinsToTime } from '../lib/utils';

interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  staffId?: string | null;
  date: string;
  time: string;
  durationMins: number;
  status: string;
  notes?: string | null;
}

interface Client { id: string; firstName: string; lastName: string; }
interface Service { id: string; name: string; }
interface StaffMember { id: string; name: string; color: string; role?: string | null; }

interface WeekViewProps {
  weekDays: Date[];
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  staff?: StaffMember[];
  staffFilter?: string | null;
  onAppointmentClick: (id: string) => void;
  onSlotClick: (date: string, time: string) => void;
}

const HOURS = Array.from({ length: 11 }, (_, i) =>
  `${(i + 9).toString().padStart(2, '0')}:00`
);
const START_HOUR = 9;
const HOUR_H = 72;

export const WeekView = ({
  weekDays,
  appointments,
  clients,
  services,
  staff = [],
  staffFilter = null,
  onAppointmentClick,
  onSlotClick,
}: WeekViewProps) => {
  const today = new Date();
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const filteredApps = staffFilter
    ? appointments.filter(a => a.staffId === staffFilter)
    : appointments;

  const onBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  };
  const onHeaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (bodyScrollRef.current) bodyScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  };

  const dayColClass =
    'shrink-0 w-[calc((100vw-2.5rem)/3)] md:flex-1 md:w-0 border-l border-stone-100 first:border-l-0';

  const totalH = HOURS.length * HOUR_H;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b border-stone-100 sticky top-0 bg-white z-10">
        <div className="w-10 md:w-14 shrink-0" />
        <div
          ref={headerScrollRef}
          onScroll={onHeaderScroll}
          className="flex-1 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="flex">
            {weekDays.map(day => {
              const isToday = isSameDay(day, today);
              return (
                <div key={day.toISOString()} className={cn(dayColClass, 'text-center py-2 px-1')}>
                  <p className={cn('text-[10px] font-semibold uppercase tracking-wider', isToday ? 'text-brand-dark' : 'text-stone-400')}>
                    {format(day, 'EEE', { locale: it })}
                  </p>
                  <p className={cn('text-sm font-medium mt-0.5', isToday
                    ? 'w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center mx-auto'
                    : 'text-stone-700')}>
                    {format(day, 'd')}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex max-h-[62vh] overflow-y-auto">
        {/* Time gutter */}
        <div className="w-10 md:w-14 shrink-0 relative" style={{ height: totalH }}>
          {HOURS.map((hour, i) => (
            <div key={hour} className="absolute right-1 md:right-2" style={{ top: i * HOUR_H + 4 }}>
              <span className="text-[9px] md:text-[10px] font-medium text-stone-400 leading-none">{hour}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div
          ref={bodyScrollRef}
          onScroll={onBodyScroll}
          className="flex-1 overflow-x-auto"
        >
          <div className="flex" style={{ height: totalH }}>
            {weekDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayApps = filteredApps.filter(a => a.date === dateStr);
              const layout = computeCalendarLayout(dayApps, START_HOUR, HOUR_H, 22);

              return (
                <div key={day.toISOString()} className={cn(dayColClass, 'relative')}>
                  {/* Hour grid lines — clickable to add appointment */}
                  {HOURS.map((hour, i) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-b border-stone-50 hover:bg-stone-50/60 transition-colors cursor-pointer group"
                      style={{ top: i * HOUR_H, height: HOUR_H }}
                      onClick={() => onSlotClick(dateStr, hour)}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <Plus className="w-3 h-3 text-stone-300" />
                      </div>
                    </div>
                  ))}

                  {/* Appointments — absolutely positioned by time + duration */}
                  {layout.map(({ item: app, top, height, leftPct, widthPct }) => {
                    const client = clients.find(c => c.id === app.clientId);
                    const service = services.find(s => s.id === app.serviceId);
                    const staffMember = staff.find(m => m.id === app.staffId);
                    const isCancelled = app.status === 'annullato';
                    const isNoShow = app.status === 'no-show';
                    const isCompleted = app.status === 'completato';
                    const sc = staffMember?.color ?? '#94a3b8';
                    return (
                      <div
                        key={app.id}
                        onClick={e => { e.stopPropagation(); onAppointmentClick(app.id); }}
                        className={cn(
                          'absolute rounded-lg border border-stone-200 px-1.5 py-1 cursor-pointer hover:shadow-md transition-shadow overflow-hidden flex flex-col',
                          isCompleted ? 'bg-stone-50 text-stone-400' : 'text-stone-800',
                          (isCancelled || isNoShow) && 'text-stone-400',
                        )}
                        style={{
                          top: top + 2,
                          height: height - 4,
                          left: `calc(${leftPct * 100}% + 2px)`,
                          width: `calc(${widthPct * 100}% - 4px)`,
                          borderLeftColor: sc,
                          borderLeftWidth: '3px',
                          zIndex: 1,
                          ...(!isCompleted && {
                            backgroundColor: (isCancelled || isNoShow)
                              ? hexAlpha(sc, 0.06)
                              : hexAlpha(sc, 0.14),
                          }),
                        }}
                      >
                        <p className="text-[9px] font-bold leading-none tracking-wide opacity-80">
                          {app.time} → {addMinsToTime(app.time, app.durationMins)}
                        </p>
                        <p className={cn('text-[10px] font-semibold leading-tight truncate mt-0.5', isCancelled && 'line-through')}>
                          {client?.firstName} {client?.lastName}
                        </p>
                        <p className="text-[9px] leading-tight truncate opacity-50">
                          {service?.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
