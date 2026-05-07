import React, { useState } from 'react';
import { store } from '../lib/store';
import { useListAppointments, useListClients, useListServices, useListStaff } from '@workspace/api-client-react';
import { format, addDays, subDays, addWeeks, subWeeks, startOfWeek, eachDayOfInterval, endOfWeek } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { ManageAppointmentModal } from '../components/ManageAppointmentModal';
import { EditAppointmentModal } from '../components/EditAppointmentModal';
import { CompleteAppointmentModal } from '../components/CompleteAppointmentModal';
import { WeekView } from '../components/WeekView';
import { NewAppointmentModal } from '../components/NewAppointmentModal';

type View = 'day' | 'week';

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

  const isLoading = loadingAppts || loadingClients || loadingServices;

  const dateString = format(selectedDate, 'yyyy-MM-dd');

  const filteredAppointments = staffFilter
    ? appointments.filter(a => a.staffId === staffFilter)
    : appointments;

  const dailyAppointments = filteredAppointments
    .filter(a => a.date === dateString)
    .sort((a, b) => a.time.localeCompare(b.time));

  const hours = Array.from({ length: 11 }, (_, i) => `${(i + 9).toString().padStart(2, '0')}:00`);

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
            className={cn(
              'px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border',
              staffFilter === null
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
            )}
          >
            Tutti
          </button>
          {staff.map(member => (
            <button
              key={member.id}
              onClick={() => setStaffFilter(staffFilter === member.id ? null : member.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border',
                staffFilter === member.id
                  ? 'text-white border-transparent'
                  : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
              )}
              style={staffFilter === member.id ? { backgroundColor: member.color, borderColor: member.color } : undefined}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: staffFilter === member.id ? 'rgba(255,255,255,0.7)' : member.color }}
              />
              {member.name}
            </button>
          ))}
        </div>
      )}
      {/* View toggle + navigation */}
      <div className="flex flex-col gap-3">
        {/* Toggle */}
        <div className="flex rounded-xl p-1 self-center text-left bg-[#f5f5f400]">
          <button
            onClick={() => setView('day')}
            className={cn(
              'px-5 py-1.5 rounded-lg text-sm font-medium transition-all',
              view === 'day' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            Giorno
          </button>
          <button
            onClick={() => setView('week')}
            className={cn(
              'px-5 py-1.5 rounded-lg text-sm font-medium transition-all',
              view === 'week' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            )}
          >
            Settimana
          </button>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl shadow-sm border border-stone-100">
          <button
            onClick={goBack}
            className="p-2 text-stone-400 hover:text-stone-900 active:bg-stone-50 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            {navTitle}
          </div>
          <button
            onClick={goForward}
            className="p-2 text-stone-400 hover:text-stone-900 active:bg-stone-50 rounded-full transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Day view */}
      {view === 'day' && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-2 relative pb-20">
          <div className="flex flex-col">
            {hours.map((hour) => {
              const hourNum = hour.split(':')[0];
              const appointmentsInHour = dailyAppointments.filter(
                a => a.time.split(':')[0] === hourNum
              );

              return (
                <div key={hour} className="flex gap-4 min-h-[80px] group relative">
                  <div className="w-14 text-right pt-2 shrink-0">
                    <span className="text-xs font-medium text-stone-400">{hour}</span>
                  </div>

                  <div className="w-px bg-stone-100 relative top-4 shrink-0">
                    <div className="w-2 h-2 rounded-full absolute -left-[3px] -top-1 bg-stone-200"></div>
                  </div>

                  <div className="flex-1 pt-2 pb-4 pr-2 min-w-0">
                    {appointmentsInHour.length > 0 ? (
                      <div className="relative flex gap-2 pr-7">
                        {appointmentsInHour.map(app => {
                          const client = clients.find(c => c.id === app.clientId);
                          const service = services.find(s => s.id === app.serviceId);
                          const staffMember = staff.find(m => m.id === app.staffId);
                          return (
                            <div
                              key={app.id}
                              onClick={() => setManageAppId(app.id)}
                              className={cn(
                                "flex-1 min-w-0 p-3 rounded-xl border flex flex-col gap-1 active:scale-[0.98] transition-all cursor-pointer hover:shadow-md",
                                app.status === 'completato' ? "bg-stone-50 border-stone-200 text-stone-500" :
                                app.status === 'prenotato' ? "text-white" :
                                "bg-white border-stone-200 text-stone-900"
                              )}
                              style={app.status === 'prenotato' ? {
                                backgroundColor: 'var(--color-brand-dark)',
                                borderColor: 'var(--color-brand-dark)',
                              } : undefined}
                            >
                              <div className="flex justify-between items-start gap-1">
                                <p className="font-medium text-sm truncate">
                                  {client?.firstName} {client?.lastName}
                                </p>
                                <span className="text-[10px] uppercase opacity-70 tracking-wide font-mono shrink-0">
                                  {app.time}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <p className={cn(
                                  "text-xs truncate flex-1",
                                  app.status === 'prenotato' ? "opacity-70" : "text-stone-500"
                                )}>
                                  {service?.name}
                                </p>
                                {staffMember && (
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: staffMember.color }}
                                    title={staffMember.name}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <button
                          onClick={() => handleSlotClick(dateString, hour)}
                          className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-stone-300 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-all opacity-0 group-hover:opacity-100"
                          title="Aggiungi appuntamento"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-full border-t border-dashed border-stone-100 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          onClick={() => handleSlotClick(dateString, hour)}
                          className="text-xs text-brand-dark flex items-center gap-1 font-medium bg-stone-50 px-3 py-1.5 rounded-full hover:bg-brand-light transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Aggiungi
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
      {/* Local modal for slot-click prefill (day and week view) */}
      <NewAppointmentModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        defaultDate={slotDate}
        defaultTime={slotTime}
      />
    </div>
  );
};
