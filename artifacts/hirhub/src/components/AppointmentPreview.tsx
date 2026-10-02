import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X } from 'lucide-react';
import type { Appointment, Client, Service, StaffMember } from '@workspace/api-client-react';
import { cn, addMinsToTime } from '../lib/utils';

interface PreviewData {
  appointment: Appointment | undefined;
  clients: Client[];
  services: Service[];
  staff: StaffMember[];
}

const STATUS_STYLE: Record<string, string> = {
  prenotato: 'bg-yellow-100 text-yellow-700',
  completato: 'bg-green-100 text-green-700',
  annullato: 'bg-red-100 text-red-700',
  'no-show': 'bg-red-100 text-red-700',
};

/** What a preview shows: time, client, services, operator, status and notes. */
const Summary = ({ appointment: app, clients, services, staff, large }: PreviewData & { large?: boolean }) => {
  if (!app) return null;
  const client = clients.find(c => c.id === app.clientId);
  const member = staff.find(m => m.id === app.staffId);
  const appServices = app.serviceIds.map(sid => services.find(s => s.id === sid)).filter(Boolean) as Service[];
  return (
    <div className={cn('flex flex-col', large ? 'gap-3' : 'gap-2')}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('font-bold text-stone-900', large ? 'text-xl' : 'text-base')}>
          {app.time} → {addMinsToTime(app.time, app.durationMins)}
        </span>
        <span className={cn('text-stone-400', large ? 'text-sm' : 'text-xs')}>{app.durationMins} min</span>
        <span className={cn('font-bold uppercase tracking-wide rounded-sm ml-auto', large ? 'text-xs px-2.5 py-1' : 'text-[0.625rem] px-2 py-0.5', STATUS_STYLE[app.status])}>
          {app.status}
        </span>
      </div>
      <p className={cn('font-serif text-stone-900 leading-tight', large ? 'text-3xl' : 'text-xl', app.status === 'annullato' && 'line-through')}>
        {client ? `${client.firstName} ${client.lastName}` : '(Senza nome)'}
      </p>
      <div className="flex flex-wrap gap-1">
        {appServices.length === 0 && (
          <span className="text-xs font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">Servizio da inserire</span>
        )}
        {appServices.map(s => (
          <span key={s.id} className={cn('flex items-center gap-1.5 font-medium text-stone-600 bg-stone-100 rounded-full', large ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5')}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
      <p className={cn('flex items-center gap-1.5 text-stone-600', large ? 'text-base' : 'text-sm')}>
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: member?.color ?? '#94a3b8' }} />
        {member?.name ?? 'Non assegnato'}
      </p>
      {app.notes && <p className={cn('text-stone-500 line-clamp-3', large ? 'text-base' : 'text-sm')}>{app.notes}</p>}
    </div>
  );
};

/** Touch: first tap on a block opens this sheet, a second tap (or "Apri") opens the full appointment. */
export const AppointmentPreviewSheet = ({ onOpen, onClose, ...data }: PreviewData & {
  onOpen: (id: string) => void;
  onClose: () => void;
}) => createPortal(
  <AnimatePresence>
    {data.appointment && (
      <motion.div
        key="preview-sheet"
        data-appointment-preview
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="fixed bottom-0 inset-x-0 z-[60] pointer-events-none"
      >
        <div
          className="pointer-events-auto mx-auto max-w-lg bg-white rounded-t-3xl border border-stone-200 shadow-[0_-8px_30px_rgba(28,25,23,0.18)] px-5 pt-2"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="flex justify-center pb-1">
            <span className="w-10 h-1 rounded-full bg-stone-200" />
          </div>
          <div className="flex justify-end -mb-2">
            <button onClick={onClose} aria-label="Chiudi anteprima" className="p-1.5 -mr-2 text-stone-400 hover:text-stone-700 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <Summary {...data} />
          <button
            onClick={() => onOpen(data.appointment!.id)}
            className="btn-brand w-full mt-4 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-1"
          >
            Apri appuntamento <ChevronRight className="w-4 h-4" />
          </button>
          <p className="text-[0.6875rem] text-stone-400 text-center mt-2">Oppure tocca di nuovo l'appuntamento</p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>,
  document.body,
);

/** Mouse: hovering a block shows this card next to it; clicking opens the appointment directly. */
export const AppointmentHoverCard = ({ anchor, ...data }: PreviewData & { anchor: DOMRect | null }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !ref.current) { setPos(null); return; }
    const { width, height } = ref.current.getBoundingClientRect();
    const gap = 8;
    const left = anchor.right + gap + width <= window.innerWidth
      ? anchor.right + gap
      : Math.max(gap, anchor.left - gap - width);
    const top = Math.min(Math.max(gap, anchor.top), window.innerHeight - height - gap);
    setPos({ left, top });
  }, [anchor, data.appointment?.id]);

  if (!anchor || !data.appointment) return null;
  return createPortal(
    <div
      ref={ref}
      className="fixed z-[70] w-[26.25rem] bg-white rounded-3xl border border-stone-300 p-6 pointer-events-none shadow-[0_32px_80px_-12px_rgba(28,25,23,0.6),0_12px_28px_-8px_rgba(28,25,23,0.35)]"
      style={pos ?? { left: -9999, top: 0 }}
    >
      <Summary {...data} large />
    </div>,
    document.body,
  );
};
