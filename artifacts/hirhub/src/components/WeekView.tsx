import React, { useRef } from 'react';
import { format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { cn } from '../lib/utils';

interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  date: string;
  time: string;
  durationMins: number;
  status: string;
  notes?: string | null;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
}

interface Service {
  id: string;
  name: string;
}

interface WeekViewProps {
  weekDays: Date[];
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  onAppointmentClick: (id: string) => void;
  onSlotClick: (date: string, time: string) => void;
}

const HOURS = Array.from({ length: 11 }, (_, i) =>
  `${(i + 9).toString().padStart(2, '0')}:00`
);

const STATUS_CLASSES: Record<string, string> = {
  completato: 'bg-stone-50 border-stone-200 text-stone-400',
  prenotato: 'bg-stone-900 border-stone-900 text-white',
  confermato: 'bg-brand-light border-brand-dark/20 text-brand-dark',
  annullato: 'bg-red-50 border-red-200 text-red-400 line-through',
  'no-show': 'bg-red-50 border-red-200 text-red-400',
};

export const WeekView = ({
  weekDays,
  appointments,
  clients,
  services,
  onAppointmentClick,
  onSlotClick,
}: WeekViewProps) => {
  const today = new Date();
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  const getAppsForSlot = (day: Date, hour: string) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const hourNum = hour.split(':')[0];
    return appointments.filter(
      a => a.date === dateStr && a.time.split(':')[0] === hourNum
    );
  };

  const onBodyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const onHeaderScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (bodyScrollRef.current) {
      bodyScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const dayColClass =
    'shrink-0 w-[calc((100vw-2.5rem)/3)] md:flex-1 md:w-0 border-l border-stone-100 first:border-l-0';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
      {/* Day headers row */}
      <div className="flex border-b border-stone-100 sticky top-0 bg-white z-10">
        {/* Time gutter */}
        <div className="w-10 md:w-14 shrink-0" />
        {/* Scrollable header — hidden scrollbar, synced with body */}
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
                <div
                  key={day.toISOString()}
                  className={cn(dayColClass, 'text-center py-2 px-1')}
                >
                  <p className={cn(
                    'text-[10px] font-semibold uppercase tracking-wider',
                    isToday ? 'text-brand-dark' : 'text-stone-400'
                  )}>
                    {format(day, 'EEE', { locale: it })}
                  </p>
                  <p className={cn(
                    'text-sm font-medium mt-0.5',
                    isToday
                      ? 'w-6 h-6 rounded-full bg-stone-900 text-white flex items-center justify-center mx-auto'
                      : 'text-stone-700'
                  )}>
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
        <div className="w-10 md:w-14 shrink-0 flex flex-col">
          {HOURS.map(hour => (
            <div key={hour} className="h-[72px] flex items-start justify-end pr-1 md:pr-2 pt-1 shrink-0">
              <span className="text-[9px] md:text-[10px] font-medium text-stone-400 leading-none">{hour}</span>
            </div>
          ))}
        </div>

        {/* Day columns — horizontal scroll on mobile (3 visible) */}
        <div
          ref={bodyScrollRef}
          onScroll={onBodyScroll}
          className="flex-1 overflow-x-auto"
        >
          <div className="flex">
            {weekDays.map(day => (
              <div key={day.toISOString()} className={cn(dayColClass, 'flex flex-col')}>
                {HOURS.map(hour => {
                  const slotApps = getAppsForSlot(day, hour);
                  const dateStr = format(day, 'yyyy-MM-dd');

                  return (
                    <div
                      key={hour}
                      onClick={() => slotApps.length === 0 && onSlotClick(dateStr, hour)}
                      className={cn(
                        'h-[72px] border-b border-stone-50 p-1 relative group',
                        slotApps.length === 0 && 'cursor-pointer hover:bg-stone-50/60 transition-colors'
                      )}
                    >
                      {slotApps.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="w-3 h-3 text-stone-300" />
                        </div>
                      )}
                      {slotApps.map(app => {
                        const client = clients.find(c => c.id === app.clientId);
                        const service = services.find(s => s.id === app.serviceId);
                        return (
                          <div
                            key={app.id}
                            onClick={e => { e.stopPropagation(); onAppointmentClick(app.id); }}
                            className={cn(
                              'rounded-lg border px-1.5 py-1 cursor-pointer hover:shadow-sm transition-all active:scale-[0.97] mb-0.5 overflow-hidden',
                              STATUS_CLASSES[app.status] ?? 'bg-white border-stone-200 text-stone-900'
                            )}
                            style={{ minHeight: '52px', maxHeight: '66px' }}
                          >
                            <p className="text-[10px] font-semibold leading-tight truncate">
                              {client?.firstName} {client?.lastName}
                            </p>
                            <p className={cn(
                              'text-[9px] leading-tight truncate mt-0.5',
                              app.status === 'prenotato' ? 'opacity-70' : 'opacity-60'
                            )}>
                              {app.time} · {service?.name}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
