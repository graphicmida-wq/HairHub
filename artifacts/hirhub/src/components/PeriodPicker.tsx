import { useState } from 'react';
import { subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { PERIOD_MODES, periodLabel, periodRange, shiftAnchor, ymd, type PeriodMode } from '../lib/period';

const CHIP = "shrink-0 py-2 rounded-full font-medium border transition-all active:scale-95 px-0 text-xs sm:text-sm md:px-4";
const CHIP_ON = "btn-brand text-white border-transparent";
const CHIP_OFF = "bg-white text-stone-600 border-stone-200 hover:border-brand-dark/30";
const DATE_INPUT = "bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-brand-dark";
const NAV_BUTTON = "w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-600 hover:border-brand-dark/30 active:scale-95 transition-all shrink-0";

export function usePeriod(initialMode: PeriodMode = 'mese') {
  const [mode, setModeState] = useState<PeriodMode>(initialMode);
  const [anchor, setAnchor] = useState(() => new Date());
  const [customFrom, setCustomFrom] = useState(() => ymd(subDays(new Date(), 29)));
  const [customTo, setCustomTo] = useState(() => ymd(new Date()));
  const { from, to } = periodRange(mode, anchor, customFrom, customTo);
  return {
    mode, from, to, customFrom, customTo,
    label: periodLabel(mode, from, to),
    setMode: (m: PeriodMode) => { setModeState(m); setAnchor(new Date()); },
    shift: (dir: 1 | -1) => setAnchor(a => shiftAnchor(mode, a, dir)),
    setCustomFrom, setCustomTo,
  };
}

export type Period = ReturnType<typeof usePeriod>;

/** Mode chips (five equal cells on phones) + arrows, or two dates for a custom range. */
export const PeriodPicker = ({ period, onChange }: { period: Period; onChange?: () => void }) => (
  <>
    <div className="grid grid-cols-5 gap-1 md:flex md:gap-2">
      {PERIOD_MODES.map(m => (
        <button key={m.value}
          onClick={() => { period.setMode(m.value); onChange?.(); }}
          className={cn(CHIP, period.mode === m.value ? CHIP_ON : CHIP_OFF)}>
          {m.label}
        </button>
      ))}
    </div>

    {period.mode === 'periodo' ? (
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-xs text-on-page-muted">
          Dal
          <input type="date" value={period.customFrom} onChange={e => { period.setCustomFrom(e.target.value); onChange?.(); }} className={DATE_INPUT} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-on-page-muted">
          Al
          <input type="date" value={period.customTo} onChange={e => { period.setCustomTo(e.target.value); onChange?.(); }} className={DATE_INPUT} />
        </label>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <button onClick={() => { period.shift(-1); onChange?.(); }} aria-label="Periodo precedente" className={NAV_BUTTON}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center font-medium text-on-page truncate">{period.label}</div>
        <button onClick={() => { period.shift(1); onChange?.(); }} aria-label="Periodo successivo" className={NAV_BUTTON}>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    )}
  </>
);
