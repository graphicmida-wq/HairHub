import React, { useState } from 'react';
import { store } from '../lib/store';
import { useListAppointments, useListClients, useListServices } from '@workspace/api-client-react';
import { format, addDays, subDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { ManageAppointmentModal } from '../components/ManageAppointmentModal';
import { EditAppointmentModal } from '../components/EditAppointmentModal';
import { CompleteAppointmentModal } from '../components/CompleteAppointmentModal';

export const Appointments = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [manageAppId, setManageAppId] = useState<string | null>(null);
  const [editAppId, setEditAppId] = useState<string | null>(null);
  const [completeAppId, setCompleteAppId] = useState<string | null>(null);

  const { data: appointments = [], isLoading: loadingAppts, isError: errorAppts } = useListAppointments();
  const { data: clients = [], isLoading: loadingClients } = useListClients();
  const { data: services = [], isLoading: loadingServices } = useListServices();

  const isLoading = loadingAppts || loadingClients || loadingServices;

  const dateString = selectedDate.toISOString().split('T')[0];

  const dailyAppointments = appointments
    .filter(a => a.date === dateString)
    .sort((a, b) => a.time.localeCompare(b.time));

  const hours = Array.from({ length: 11 }, (_, i) => `${(i + 9).toString().padStart(2, '0')}:00`);

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
        <button onClick={() => store.openModal('isNewAppointmentOpen')} className="hidden md:flex items-center gap-2 bg-stone-900 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors">
          <Plus className="w-4 h-4" /> Nuovo Appuntamento
        </button>
      </div>

      <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl shadow-sm border border-stone-100">
        <button
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          className="p-2 text-stone-400 hover:text-stone-900 active:bg-stone-50 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-sm text-stone-500 font-medium uppercase tracking-wider">
            {format(selectedDate, 'EEEE', { locale: it })}
          </p>
          <p className="font-serif text-lg text-stone-900">
            {format(selectedDate, 'd MMMM yyyy', { locale: it })}
          </p>
        </div>
        <button
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="p-2 text-stone-400 hover:text-stone-900 active:bg-stone-50 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-2 relative pb-20">
        <div className="flex flex-col">
          {hours.map((hour) => {
            const appointmentInHour = dailyAppointments.find(a => a.time.startsWith(hour.split(':')[0]));
            let client, service;
            if (appointmentInHour) {
              client = clients.find(c => c.id === appointmentInHour.clientId);
              service = services.find(s => s.id === appointmentInHour.serviceId);
            }

            return (
              <div key={hour} className="flex gap-4 min-h-[80px] group relative">
                <div className="w-14 text-right pt-2 shrink-0">
                  <span className="text-xs font-medium text-stone-400">{hour}</span>
                </div>

                <div className="w-px bg-stone-100 relative top-4 shrink-0">
                  <div className="w-2 h-2 rounded-full absolute -left-[3px] -top-1 bg-stone-200"></div>
                </div>

                <div className="flex-1 pt-2 pb-4 pr-2 min-w-0">
                  {appointmentInHour ? (
                    <div
                      onClick={() => setManageAppId(appointmentInHour.id)}
                      className={cn(
                        "p-3 rounded-xl border flex flex-col gap-1 active:scale-[0.98] transition-all cursor-pointer hover:shadow-md",
                        appointmentInHour.status === 'completato' ? "bg-stone-50 border-stone-200 text-stone-500" :
                        appointmentInHour.status === 'prenotato' ? "bg-stone-900 border-stone-900 text-white" :
                        "bg-white border-stone-200 text-stone-900"
                      )}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-medium text-sm truncate">
                          {client?.firstName} {client?.lastName}
                        </p>
                        <span className="text-[10px] uppercase opacity-70 tracking-wide font-mono shrink-0">
                          {appointmentInHour.time}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm truncate",
                        appointmentInHour.status === 'prenotato' ? "text-stone-300" : "text-stone-500"
                      )}>
                        {service?.name}
                      </p>
                    </div>
                  ) : (
                    <div className="h-full border-t border-dashed border-stone-100 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => store.openModal('isNewAppointmentOpen')} className="text-xs text-brand-dark flex items-center gap-1 font-medium bg-stone-50 px-3 py-1.5 rounded-full hover:bg-brand-light transition-colors">
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
    </div>
  );
};
