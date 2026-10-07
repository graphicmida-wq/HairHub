import React from 'react';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { sentLabel, useReminderMark, whatsappLink, type Reminder } from '../lib/whatsapp';

/** Opens WhatsApp on the client's chat with the message written, and marks the reminder as sent */
export const ReminderLink = ({
  reminder,
  children,
  className,
}: {
  reminder: Reminder;
  children: React.ReactNode;
  className?: string;
}) => {
  const mark = useReminderMark();
  if (reminder.number.kind !== 'ok') return null;
  const { href, newTab } = whatsappLink(reminder.number.digits, reminder.message);
  return (
    <a
      href={href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noopener noreferrer' : undefined}
      onClick={() => mark.mutate({ data: { appointmentIds: reminder.appointments.map(a => a.id), sent: true } })}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-colors',
        'bg-emerald-50 hover:bg-green-100 text-emerald-700 border border-emerald-600/30',
        className,
      )}
    >
      <MessageCircle className="w-4 h-4 shrink-0" />
      {children}
    </a>
  );
};

/** "✓ Inviato oggi alle 18:32   Togli segno" */
export const ReminderSentNote = ({ reminder, className }: { reminder: Reminder; className?: string }) => {
  const mark = useReminderMark();
  if (!reminder.sentAt) return null;
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-emerald-700', className)}>
      <span className="inline-flex items-center gap-1.5">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Inviato {sentLabel(reminder.sentAt)}
      </span>
      <button
        type="button"
        disabled={mark.isPending}
        onClick={() => mark.mutate({ data: { appointmentIds: reminder.appointments.map(a => a.id), sent: false } })}
        className="text-stone-500 hover:text-stone-800 underline underline-offset-2 disabled:opacity-50"
      >
        Togli segno
      </button>
    </span>
  );
};

/** Why there is no WhatsApp button for this client */
export const ReminderNumberProblem = ({ reminder, className }: { reminder: Reminder; className?: string }) => {
  if (reminder.number.kind === 'missing') {
    return <span className={cn('text-sm text-stone-400', className)}>Nessun numero in scheda</span>;
  }
  if (reminder.number.kind === 'invalid') {
    return (
      <span className={cn('text-sm text-amber-700', className)}>
        Numero da controllare: {reminder.client?.phone}
      </span>
    );
  }
  return null;
};
