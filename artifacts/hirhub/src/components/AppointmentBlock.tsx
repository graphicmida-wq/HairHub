import React, { useRef } from 'react';
import type { Appointment, Client, Service } from '@workspace/api-client-react';
import { cn, addMinsToTime, type CalendarBox } from '../lib/utils';
import { useFontScale } from '../lib/font-scale';

/** How the agenda reacts to taps and mouse hover on an appointment block. */
export interface BlockInteraction {
  /** Appointment whose preview is open (drawn highlighted, on top) */
  selectedId: string | null;
  onTap: (id: string, el: HTMLElement, pointerType: string) => void;
  onHover: (id: string | null, el?: HTMLElement) => void;
}

interface AppointmentBlockProps {
  box: CalendarBox<Appointment>;
  clients: Client[];
  services: Service[];
  interaction: BlockInteraction;
  /** Smaller text and indent, for the week grid */
  compact?: boolean;
}

export const AppointmentBlock = ({ box, clients, services, interaction, compact }: AppointmentBlockProps) => {
  const pointerType = useRef('mouse');
  const scale = useFontScale();
  const { item: app, top, height, depth, slot, slots, z, clearPx } = box;
  const client = clients.find(c => c.id === app.clientId);
  const clientName = `${client?.firstName ?? ''} ${client?.lastName ?? ''}`.trim() || '(Senza nome)';
  const serviceNames = app.serviceIds.map(sid => services.find(s => s.id === sid)?.name).filter(Boolean).join(' · ');
  const color = services.find(s => s.id === app.serviceIds[0])?.color ?? '#94a3b8';
  const isCancelled = app.status === 'annullato';
  const isMuted = isCancelled || app.status === 'no-show' || app.status === 'completato';
  const isSelected = interaction.selectedId === app.id;

  const indent = Math.min(depth, 5) * (compact ? 8 : 14);
  // Space left free on each side of the block, so neighbours and column edges never touch it
  const [gapL, gapR] = compact ? [2, 2] : [3, 6];
  const oneLine = height < (compact ? 28 : 34) * scale;
  const timeLabel = `${app.time} → ${addMinsToTime(app.time, app.durationMins)}`;

  return (
    <div
      data-appointment-block
      role="button"
      tabIndex={0}
      onPointerDown={e => { pointerType.current = e.pointerType; }}
      onPointerEnter={e => { if (e.pointerType === 'mouse') interaction.onHover(app.id, e.currentTarget); }}
      onPointerLeave={e => { if (e.pointerType === 'mouse') interaction.onHover(null); }}
      onClick={e => {
        e.stopPropagation();
        interaction.onTap(app.id, e.currentTarget, pointerType.current);
        pointerType.current = 'mouse';
      }}
      onKeyDown={e => { if (e.key === 'Enter') interaction.onTap(app.id, e.currentTarget, 'keyboard'); }}
      className={cn(
        '@container absolute rounded-lg border overflow-hidden cursor-pointer select-none transition-shadow hover:shadow-md',
        compact ? 'px-1.5 py-0.5' : 'px-2.5 py-1.5',
        isMuted ? 'bg-stone-50 text-stone-400' : 'bg-white text-stone-800',
        isSelected ? 'border-stone-900 ring-2 ring-stone-900/80 shadow-lg' : 'border-stone-200',
      )}
      style={{
        top: top + 1,
        height: height - 2,
        left: `calc(${indent}px + (100% - ${indent}px) * ${slot / slots} + ${gapL}px)`,
        width: `calc((100% - ${indent}px) / ${slots} - ${gapL + gapR}px)`,
        borderLeft: `4px solid ${color}`,
        // White edge on the left keeps a block readable where it sits on top of another one
        boxShadow: depth > 0 && !isSelected ? '-2px 0 0 #fff, 0 1px 3px rgba(28,25,23,0.14)' : undefined,
        zIndex: isSelected ? 500 : z,
      }}
    >
      {/* Too narrow for readable text: only the colour shows, details are in the preview */}
      <div className="hidden @min-[28px]:block">
        {oneLine ? (
          <p className={cn('truncate leading-tight', compact ? 'text-[0.625rem]' : 'text-xs')}>
            <span className="font-bold opacity-80">{app.time}</span>{' '}
            <span className={cn('font-semibold', isCancelled && 'line-through')}>{clientName}</span>
          </p>
        ) : (
          <>
            <p className={cn('font-bold leading-tight opacity-80 truncate', compact ? 'text-[0.5625rem]' : 'text-[0.6875rem]')}>
              {timeLabel}
            </p>
            <p className={cn('font-semibold leading-tight truncate', compact ? 'text-[0.625rem]' : 'text-[0.8125rem]', isCancelled && 'line-through')}>
              {clientName}
            </p>
            {Math.min(height, clearPx) >= (compact ? 44 : 58) * scale && (
              <p className={cn('leading-tight truncate opacity-60', compact ? 'text-[0.5625rem]' : 'text-[0.6875rem]')}>
                {serviceNames || 'Servizio da inserire'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
