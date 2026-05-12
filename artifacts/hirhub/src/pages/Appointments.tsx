import React, { useState } from 'react';
import { store } from '../lib/store';
import { useListAppointments, useListClients, useListServices, useListStaff } from '@workspace/api-client-react';
import { format, addDays, subDays, addWeeks, subWeeks, startOfWeek, eachDayOfInterval, endOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { cn, hexAlpha, computeCalendarLayout, addMinsToTime } from '../lib/utils';
import { ManageAppointmentModal } from '../components/ManageAppointmentModal';
import { EditAppointmentModal } from '../components/EditAppointmentModal';
import { CompleteAppointmentModal } from '../components/CompleteAppointmentModal';
import { WeekView } from '../components/WeekView';
import { NewAppointmentModal } from '../components/NewAppointmentModal';

type View = 'day' | 'week';

const HOURS = Array.from({ length: 11 }, (_, i) => `${(i + 9).toString().padStart(2, '0')}:00`);
const START_HOUR = 9;
const HOUR_H = 72;

export const Appointments = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<View>('day');
  const [manageAppId, setManageAppId] = useState<string | null>(null);
  const [editAppId, setEditAppId] = useState<string | null>(null);
  const [completeAppId, setCompleteAppId] = useState<string | null>(null);
  const [slotDate, setSlotDate] = useState<string | undefined>(undefined);
  const [slotTime, setSlotTime] = useState<string | undefined>(undefined);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);

  const { data: appointments = [], isLoading: loadingAppts, isError: errorAppts } = useListAppointments();
  const { data: clients = [], isLoading: loadingClients } = useListClients();
  const { data: services = [], isLoading: loadingServices } = useListServices();
  const { data: staff = [] } = useListStaff();

  const [staffFilter, setStaffFilter] = useState<string | null>(null);

  type ResourceColumn = { id: string | null; name: string; color: string };
  const resourceColumns: ResourceColumn[] = staff.map(m => ({ id: m.id, name: m.name, color: m.color }));
  const allResourceCols: ResourceColumn[] = [...resourceColumns, { id: null, name: 'Non assegnato', color: '#94a3b8' }];

  const isLoading = loadingAppts || loadingClients || loadingServices;
  const dateString = format(selectedDate, 'yyyy-MM-dd');

  const filteredAppointments = staffFilter
    ? appointments.filter(a => a.staffId === staffFilter)
    : appointments;

  const dailyAppointments = filteredAppointments
    .filter(a => a.date === dateString)
    .sort((a, b) => a.time.localeCompare(b.time));

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handleSlotClick = (date: string, time: string) => {
    setSlotDate(date);
    setSlotTime(time);
    setIsSlotModalOpen(true);
  };

  const goBack = () => {
    if (view === 'day') setSelectedDate(d => subDays(d, 1));
    else setSelectedDate(d => subWeeks(d, 1));
  };
  const goForward = () => {
    if (view === 'day') setSelectedDate(d => addDays(d, 1));
    else setSelectedDate(d => addWeeks(d, 1));
  };

  const navTitle = view === 'day'
    ? (
      <>
        <p className="text-sm text-stone-500 font-medium uppercase tracking-wider">
          {format(selectedDate, 'EEEE', { locale: it })}
        </p>
        <p className="font-serif text-lg text-stone-900">
          {format(selectedDate, 'd MMMM yyyy', { locale: it })}
        </p>
      </>
    )
    : (
      <p className="font-serif text-base text-stone-900">
        {format(weekStart, 'd MMM', { locale: it })} — {format(weekEnd, 'd MMM yyyy', { locale: it })}
      </p>
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-stone-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span className="text-sm">Caricamento agenda...</span>
      </div>
    );
  }

  if (errorAppts) {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="text-sm">Impossibile caricare gli appuntamenti. Riprova più tardi.</p>
      </div>
    );
  }

  const totalH = HOURS.length * HOUR_H;

  return (
    <div className="flex flex-col gap-6 page-enter">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-stone-900">Agenda</h1>
        <button onClick={() => store.openModal('isNewAppointmentOpen')} className="btn-brand hidden md:flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuovo Appuntamento
        </button>
      </div>

      {/* Staff filter */}
      {staff.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setStaffFilter(null)}
            className={cn('px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border',
              staffFilter === null ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
            )}
          >
            Tutti
          </button>
          {staff.map(member => (
            <button
              key={member.id}
              onClick={() => setStaffFilter(staffFilter === member.id ? null : member.id)}
              className={cn('flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border',
                staffFilter === member.id ? 'text-white border-transparent' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
              )}
              style={staffFilter === member.id ? { backgroundColor: member.color, borderColor: member.color } : undefined}
            >
              <span className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: staffFilter === member.id ? 'rgba(255,255,255,0.7)' : member.color }}
              />
              {member.name}
            </button>
          ))}
        </div>
      )}

      {/* View toggle + navigation */}
      <div className="flex flex-col gap-3">
        <div className="flex rounded-xl p-1 self-center text-left bg-[#f5f5f400]">
          <button
            onClick={() => setView('day')}
            className={cn('px-5 py-1.5 rounded-lg text-sm font-medium transition-all',
              view === 'day' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            Giorno
          </button>
          <button
            onClick={() => setView('week')}
            className={cn('px-5 py-1.5 rounded-lg text-sm font-medium transition-all',
              view === 'week' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            Settimana
          </button>
        </div>
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl shadow-sm border border-stone-100">
          <button onClick={goBack} className="p-2 text-stone-400 hover:text-stone-900 active:bg-stone-50 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">{navTitle}</div>
          <button onClick={goForward} className="p-2 text-stone-400 hover:text-stone-900 active:bg-stone-50 rounded-full transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Day view — resource mode (multiple staff, no filter) */}
      {view === 'day' && staff.length > 0 && staffFilter === null && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
          {/* Sticky column headers */}
          <div className="flex border-b border-stone-100 sticky top-0 bg-white z-10">
            <div className="w-14 shrink-0" />
            <div className="flex flex-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {allResourceCols.map(col => (
                <div
                  key={col.id ?? '__none__'}
                  className="flex-1 min-w-[110px] text-center py-2 px-2 border-l border-stone-100 first:border-l-0 flex items-center justify-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                  <span className="text-xs font-medium text-stone-700 truncate">{col.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Body — absolute positioning per column */}
          <div className="flex pb-4" style={{ minHeight: totalH }}>
            {/* Time gutter */}
            <div className="w-14 shrink-0 relative" style={{ height: totalH }}>
              {HOURS.map((hour, i) => (
                <div key={hour} className="absolute right-2" style={{ top: i * HOUR_H + 8 }}>
                  <span className="text-xs font-medium text-stone-400">{hour}</span>
                </div>
              ))}
            </div>

            {/* Staff columns */}
            <div className="flex flex-1 overflow-x-auto">
              {allResourceCols.map(col => {
                const colApps = dailyAppointments.filter(a =>
                  col.id === null ? !a.staffId : a.staffId === col.id
                );
                const layout = computeCalendarLayout(colApps, START_HOUR, HOUR_H, 22);
                return (
                  <div
                    key={col.id ?? '__none__'}
                    className="flex-1 min-w-[110px] border-l border-stone-100 first:border-l-0 relative"
                    style={{ height: totalH }}
                  >
                    {/* Hour grid lines (click to add) */}
                    {HOURS.map((hour, i) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-b border-stone-50 hover:bg-stone-50/60 transition-colors cursor-pointer"
                        style={{ top: i * HOUR_H, height: HOUR_H }}
                        onClick={() => handleSlotClick(dateString, hour)}
                      />
                    ))}
                    {/* Appointments */}
                    {layout.map(({ item: app, top, height, leftPct, widthPct }) => {
                      const client = clients.find(c => c.id === app.clientId);
                      const serviceNames = app.serviceIds.map((sid: string) => services.find(s => s.id === sid)?.name).filter(Boolean).join(' · ');
                      const isCancelled = app.status === 'annullato';
                      const isNoShow = app.status === 'no-show';
                      const isCompleted = app.status === 'completato';
                      const sc = col.color;
                      return (
                        <div
                          key={app.id}
                          onClick={() => setManageAppId(app.id)}
                          className={cn(
                            'absolute rounded-xl border border-stone-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow flex flex-col',
                            isCompleted ? 'bg-stone-50 text-stone-400' : 'text-stone-800',
                            (isCancelled || isNoShow) && 'text-stone-400',
                          )}
                          style={{
                            top: top + 2,
                            height: height - 4,
                            left: `calc(${leftPct * 100}% + 2px)`,
                            width: `calc(${widthPct * 100}% - 4px)`,
                            borderLeftColor: sc,
                            borderLeftWidth: '4px',
                            padding: '4px 6px',
                            zIndex: 1,
                            ...(!isCompleted && {
                              backgroundColor: (isCancelled || isNoShow) ? hexAlpha(sc, 0.06) : hexAlpha(sc, 0.14),
                            }),
                          }}
                        >
                          <p className="text-[10px] font-bold leading-none opacity-80">
                            {app.time} → {addMinsToTime(app.time, app.durationMins)}
                          </p>
                          <p className={cn('font-medium text-xs truncate mt-0.5', isCancelled && 'line-through')}>
                            {client?.firstName} {client?.lastName}
                          </p>
                          <p className="text-[10px] truncate opacity-50">{serviceNames}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Day view — single column (no staff configured, or filter active) */}
      {view === 'day' && (staff.length === 0 || staffFilter !== null) && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
          <div className="flex" style={{ height: totalH }}>
            {/* Time gutter */}
            <div className="w-14 shrink-0 relative">
              {HOURS.map((hour, i) => (
                <div key={hour} className="absolute right-2" style={{ top: i * HOUR_H + 8 }}>
                  <span className="text-xs font-medium text-stone-400">{hour}</span>
                </div>
              ))}
            </div>

            {/* Appointment column */}
            <div className="flex-1 relative pr-2">
              {/* Hour grid lines (click to add) */}
              {HOURS.map((hour, i) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-b border-stone-100 hover:bg-stone-50/40 transition-colors cursor-pointer"
                  style={{ top: i * HOUR_H, height: HOUR_H }}
                  onClick={() => handleSlotClick(dateString, hour)}
                />
              ))}

              {/* Appointments */}
              {computeCalendarLayout(dailyAppointments, START_HOUR, HOUR_H, 22).map(
                ({ item: app, top, height, leftPct, widthPct }) => {
                  const client = clients.find(c => c.id === app.clientId);
                  const serviceNames = app.serviceIds.map((sid: string) => services.find(s => s.id === sid)?.name).filter(Boolean).join(' · ');
                  const staffMember = staff.find(m => m.id === app.staffId);
                  const isCancelled = app.status === 'annullato';
                  const isNoShow = app.status === 'no-show';
                  const isCompleted = app.status === 'completato';
                  const sc = staffMember?.color ?? '#94a3b8';
                  return (
                    <div
                      key={app.id}
                      onClick={() => setManageAppId(app.id)}
                      className={cn(
                        'absolute rounded-xl border border-stone-200 flex flex-col cursor-pointer hover:shadow-md transition-shadow overflow-hidden',
                        isCompleted ? 'bg-stone-50 text-stone-400' : 'text-stone-800',
                        (isCancelled || isNoShow) && 'text-stone-400',
                      )}
                      style={{
                        top: top + 2,
                        height: height - 4,
                        left: `calc(${leftPct * 100}% + 4px)`,
                        width: `calc(${widthPct * 100}% - 8px)`,
                        borderLeftColor: sc,
                        borderLeftWidth: '4px',
                        padding: '6px 8px',
                        zIndex: 1,
                        ...(!isCompleted && {
                          backgroundColor: (isCancelled || isNoShow) ? hexAlpha(sc, 0.06) : hexAlpha(sc, 0.14),
                        }),
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold opacity-80 shrink-0">
                          {app.time} → {addMinsToTime(app.time, app.durationMins)}
                        </span>
                        {staffMember && (
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sc }} title={staffMember.name} />
                        )}
                      </div>
                      <p className={cn('font-medium text-sm truncate mt-0.5', isCancelled && 'line-through')}>
                        {client?.firstName} {client?.lastName}
                      </p>
                      <p className="text-xs truncate opacity-50">{serviceNames}</p>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}

      {/* Week view */}
      {view === 'week' && (
        <WeekView
          weekDays={weekDays}
          appointments={appointments}
          clients={clients}
          services={services}
          staff={staff}
          staffFilter={staffFilter}
          onAppointmentClick={(id) => setManageAppId(id)}
          onSlotClick={handleSlotClick}
        />
      )}

      <ManageAppointmentModal
        isOpen={!!manageAppId}
        onClose={() => setManageAppId(null)}
        appointmentId={manageAppId}
        onEdit={(id) => setEditAppId(id)}
        onComplete={(id) => setCompleteAppId(id)}
      />
      <EditAppointmentModal
        isOpen={!!editAppId}
        onClose={() => setEditAppId(null)}
        appointmentId={editAppId}
      />
      <CompleteAppointmentModal
        isOpen={!!completeAppId}
        onClose={() => setCompleteAppId(null)}
        appointmentId={completeAppId}
      />
      <NewAppointmentModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        defaultDate={slotDate}
        defaultTime={slotTime}
      />
    </div>
  );
};
