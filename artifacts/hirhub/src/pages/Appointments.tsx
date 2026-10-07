import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { store } from '../lib/store';
import { useListAppointments, useListClients, useListServices, useListStaff } from '@workspace/api-client-react';
import { format, addDays, subDays, addWeeks, subWeeks, startOfWeek, eachDayOfInterval, endOfWeek, isSameDay, isSameWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { cn, computeCalendarLayout, calendarHours } from '../lib/utils';
import { useFontScale } from '../lib/font-scale';
import { ManageAppointmentModal } from '../components/ManageAppointmentModal';
import { EditAppointmentModal } from '../components/EditAppointmentModal';
import { CompleteAppointmentModal } from '../components/CompleteAppointmentModal';
import { WeekView } from '../components/WeekView';
import { NewAppointmentModal } from '../components/NewAppointmentModal';
import { AppointmentBlock, type BlockInteraction } from '../components/AppointmentBlock';
import { AppointmentPreviewSheet, AppointmentHoverCard } from '../components/AppointmentPreview';
import { useAuth } from '../lib/auth-context';
import { GuideLink } from '../components/GuideLink';

type View = 'day' | 'week';

/** Height of one hour at the normal text size; it grows with the text size setting */
const HOUR_H = 96;

export const Appointments = () => {
  const scale = useFontScale();
  const hourH = Math.round(HOUR_H * scale);
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
  // People with a column in the agenda (others, like an admin who doesn't work
  // on clients, are only used to show names on past appointments)
  const agendaStaff = staff.filter(m => m.inAgenda);

  // Opens on the logged-in person's own column; "Tutti" shows everyone
  const { user } = useAuth();
  const ownColumnApplied = useRef(false);
  useEffect(() => {
    if (ownColumnApplied.current || staff.length === 0) return;
    ownColumnApplied.current = true;
    if (user?.staffId && staff.some(m => m.id === user.staffId && m.inAgenda)) setStaffFilter(user.staffId);
  }, [staff, user?.staffId]);

  // Touch: first tap previews an appointment (bottom sheet), second tap opens it.
  // Mouse: hovering previews it (floating card), click opens it.
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [hover, setHover] = useState<{ id: string; rect: DOMRect } | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const dayHeaderRef = useRef<HTMLDivElement>(null);

  // Deep links from the Dashboard: /agenda?open=<appointmentId> jumps to that
  // appointment's day and opens its detail modal, /agenda?date=YYYY-MM-DD just
  // shows that day. The params are then cleared so they don't apply again.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const openId = searchParams.get('open');
    const dateParam = searchParams.get('date');
    if ((!openId && !dateParam) || loadingAppts) return;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      setView('day');
      setSelectedDate(new Date(dateParam + 'T12:00:00'));
    }
    const target = openId ? appointments.find(a => a.id === openId) : undefined;
    if (target) {
      setView('day');
      setSelectedDate(new Date(target.date + 'T12:00:00'));
      setManageAppId(target.id);
    }
    const next = new URLSearchParams(searchParams);
    next.delete('open');
    next.delete('date');
    setSearchParams(next, { replace: true });
  }, [searchParams, loadingAppts, appointments, setSearchParams]);

  const isLoading = loadingAppts || loadingClients || loadingServices;
  const dateString = format(selectedDate, 'yyyy-MM-dd');

  // Someone taken out of the agenda keeps a column on days they still have
  // appointments, so nothing disappears; unknown operators count as unassigned
  type ResourceColumn = { id: string | null; name: string; color: string };
  const busyStaffIds = new Set(appointments.filter(a => a.date === dateString && a.staffId).map(a => a.staffId));
  const columnStaff = staff.filter(m => m.inAgenda || busyStaffIds.has(m.id));
  const columnStaffIds = new Set(columnStaff.map(m => m.id));
  const resourceColumns: ResourceColumn[] = columnStaff.map(m => ({ id: m.id, name: m.name, color: m.color }));
  const allResourceCols: ResourceColumn[] = [...resourceColumns, { id: null, name: 'Non assegnato', color: '#94a3b8' }];

  const filteredAppointments = staffFilter
    ? appointments.filter(a => a.staffId === staffFilter)
    : appointments;

  const dailyAppointments = filteredAppointments
    .filter(a => a.date === dateString)
    .sort((a, b) => a.time.localeCompare(b.time));

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    setPreviewId(null);
    setHover(null);
  }, [dateString, view, staffFilter]);

  // A tap anywhere outside the blocks and the sheet closes the preview
  useEffect(() => {
    if (!previewId) return;
    const close = (e: MouseEvent) => {
      if ((e.target as Element).closest?.('[data-appointment-block],[data-appointment-preview]')) return;
      setPreviewId(null);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [previewId]);

  // The hover card is placed once, so hide it as soon as anything scrolls
  useEffect(() => {
    if (!hover) return;
    const hide = () => setHover(null);
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [hover]);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);

  const openAppointment = (id: string) => {
    setPreviewId(null);
    setHover(null);
    setManageAppId(id);
  };

  const interaction: BlockInteraction = {
    selectedId: previewId,
    onTap: (id, el, pointerType) => {
      const isTouch = pointerType === 'touch' || pointerType === 'pen';
      if (!isTouch || previewId === id) {
        openAppointment(id);
        return;
      }
      setPreviewId(id);
      // Keep the tapped block visible above the sheet
      if (el.getBoundingClientRect().bottom > window.innerHeight - 340 * scale) {
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      }
    },
    onHover: (id, el) => {
      window.clearTimeout(hoverTimer.current);
      if (!id || !el) { setHover(null); return; }
      hoverTimer.current = window.setTimeout(() => setHover({ id, rect: el.getBoundingClientRect() }), 250);
    },
  };

  const handleSlotClick = (date: string, time: string) => {
    // With a preview open, the first tap on an empty slot only closes it
    if (previewId) {
      setPreviewId(null);
      return;
    }
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

  const now = new Date();
  const year = (d: Date) => (d.getFullYear() !== now.getFullYear() ? ' yyyy' : '');
  const navTitle = view === 'day'
    ? format(selectedDate, `EEEE d MMMM${year(selectedDate)}`, { locale: it })
    : weekStart.getMonth() === weekEnd.getMonth()
      ? `${format(weekStart, 'd')} – ${format(weekEnd, `d MMMM${year(weekEnd)}`, { locale: it })}`
      : `${format(weekStart, 'd MMM', { locale: it })} – ${format(weekEnd, `d MMM${year(weekEnd)}`, { locale: it })}`;
  const showsToday = view === 'day' ? isSameDay(selectedDate, now) : isSameWeek(selectedDate, now, { weekStartsOn: 1 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-on-page-muted">
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

  const { startHour, endHour } = calendarHours(dailyAppointments);
  const hours = Array.from({ length: endHour - startHour }, (_, i) => `${String(startHour + i).padStart(2, '0')}:00`);
  const totalH = hours.length * hourH;

  // One column per operator (+ unassigned) when showing everyone, otherwise a single column
  const resourceMode = columnStaff.length > 0 && staffFilter === null;
  const dayColumns = resourceMode
    ? allResourceCols.map(col => ({
        key: col.id ?? '__none__',
        col,
        apps: dailyAppointments.filter(a =>
          col.id === null ? !a.staffId || !columnStaffIds.has(a.staffId) : a.staffId === col.id
        ),
      }))
    : [{ key: 'all', col: null, apps: dailyAppointments }];
  // On phones each operator column is almost full width and snaps while swiping sideways
  const dayColClass = resourceMode
    ? 'shrink-0 w-[88%] snap-start md:w-auto md:flex-1 md:min-w-[11.25rem] border-l border-stone-100 first:border-l-0'
    : 'flex-1';

  const viewSwitch = (
    <div className="flex bg-stone-100 rounded-lg p-0.5">
      {(['day', 'week'] as const).map(v => (
        <button
          key={v}
          onClick={() => setView(v)}
          className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-all',
            view === v ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'
          )}
        >
          {v === 'day' ? 'Giorno' : 'Settimana'}
        </button>
      ))}
    </div>
  );
  const todayButton = (
    <button
      onClick={() => setSelectedDate(new Date())}
      disabled={showsToday}
      className="px-3.5 py-1.5 rounded-lg text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
    >
      Oggi
    </button>
  );
  const navButton = 'p-2 text-stone-400 hover:text-stone-900 active:bg-stone-100 rounded-full transition-colors shrink-0';

  return (
    <div className="flex flex-col gap-4 page-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-serif text-on-page">Agenda</h1>
          <GuideLink chapter="agenda" />
        </div>
        <button onClick={() => store.openModal('isNewAppointmentOpen')} className="btn-brand hidden md:flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuovo Appuntamento
        </button>
      </div>

      {/* Toolbar and calendar share one surface; on phones it runs edge to edge (cancelling <main>'s p-6) */}
      <div className="bg-white -mx-6 md:mx-0 border-y md:border md:rounded-2xl md:shadow-sm border-stone-100 overflow-clip">
        <div className="flex flex-col gap-3 px-4 md:px-5 py-3 border-b border-stone-100">
          <div className="flex items-center gap-1">
            <button onClick={goBack} aria-label="Precedente" className={navButton}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="flex-1 md:flex-none md:min-w-[15rem] text-center font-serif text-lg text-stone-900 truncate first-letter:uppercase">
              {navTitle}
            </p>
            <button onClick={goForward} aria-label="Successivo" className={navButton}>
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="hidden md:flex items-center gap-3 ml-auto">
              {todayButton}
              {viewSwitch}
            </div>
          </div>
          <div className="flex md:hidden items-center justify-between">
            {viewSwitch}
            {todayButton}
          </div>

          {/* Staff filter */}
          {agendaStaff.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
              <button
                onClick={() => setStaffFilter(null)}
                className={cn('shrink-0 px-3 py-1 rounded-full text-[0.8125rem] font-medium transition-all border',
                  staffFilter === null ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                )}
              >
                Tutti
              </button>
              {agendaStaff.map(member => (
                <button
                  key={member.id}
                  onClick={() => setStaffFilter(staffFilter === member.id ? null : member.id)}
                  className={cn('shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.8125rem] font-medium transition-all border',
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
        </div>

        {/* Day view */}
        {view === 'day' && (
          <>
            {resourceMode && (
              // Sticky stops below <main>'s padding (p-6 / md:p-8): the negative top cancels it
              <div className="flex border-b border-stone-100 sticky -top-6 md:-top-8 bg-white z-10">
                <div className="w-[3.25rem] md:w-14 shrink-0" />
                <div ref={dayHeaderRef} className="flex flex-1 overflow-hidden">
                  {dayColumns.map(({ key, col }) => (
                    <div key={key} className={cn(dayColClass, 'text-center py-2.5 px-2 flex items-center justify-center gap-1.5')}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col?.color }} />
                      <span className="text-sm font-medium text-stone-700 truncate">{col?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex pt-3 pb-2">
              {/* Time gutter */}
              <div className="w-[3.25rem] md:w-14 shrink-0 relative" style={{ height: totalH }}>
                {hours.map((hour, i) => (
                  <div key={hour} className="absolute right-2" style={{ top: i * hourH + 6 * scale }}>
                    <span className="text-xs font-medium text-stone-400">{hour}</span>
                  </div>
                ))}
              </div>

              <div
                onScroll={e => { if (dayHeaderRef.current) dayHeaderRef.current.scrollLeft = e.currentTarget.scrollLeft; }}
                className={cn('flex flex-1 isolate pr-1.5 md:pr-0', resourceMode && 'overflow-x-auto no-scrollbar snap-x snap-mandatory md:snap-none')}
              >
                {dayColumns.map(({ key, apps }) => (
                  <div key={key} className={cn(dayColClass, 'relative')} style={{ height: totalH }}>
                    {/* Hour grid lines (click to add) */}
                    {hours.map((hour, i) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-b border-stone-100 hover:bg-stone-50/60 transition-colors cursor-pointer"
                        style={{ top: i * hourH, height: hourH }}
                        onClick={() => handleSlotClick(dateString, hour)}
                      />
                    ))}
                    {computeCalendarLayout(apps, startHour, hourH, { minH: 18 * scale, headerPx: 36 * scale }).map(box => (
                      <AppointmentBlock
                        key={box.item.id}
                        box={box}
                        clients={clients}
                        services={services}
                        interaction={interaction}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </>
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
            interaction={interaction}
            onAppointmentOpen={openAppointment}
            onSlotClick={handleSlotClick}
            onDayClick={day => { setSelectedDate(day); setView('day'); }}
          />
        )}
      </div>

      <AppointmentPreviewSheet
        appointment={previewId ? appointments.find(a => a.id === previewId) : undefined}
        clients={clients}
        services={services}
        staff={staff}
        onOpen={openAppointment}
        onClose={() => setPreviewId(null)}
      />
      <AppointmentHoverCard
        anchor={hover?.rect ?? null}
        appointment={hover ? appointments.find(a => a.id === hover.id) : undefined}
        clients={clients}
        services={services}
        staff={staff}
      />

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
