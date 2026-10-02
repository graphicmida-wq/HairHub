import React from 'react';
import { ALargeSmall, RotateCcw } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  FONT_SCALE_LEVELS,
  DEFAULT_FONT_SCALE,
  applyFontScale,
  saveFontScale,
  useFontScaleChoice,
} from '../lib/font-scale';

/** Impostazioni → Dimensione del testo: fixed levels, applied at once, saved on this device. */
export const FontSizeCard = () => {
  const { chosen: scale, applied } = useFontScaleChoice();

  const choose = (value: number) => {
    applyFontScale(value);
    saveFontScale(value);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <ALargeSmall className="w-4 h-4 text-stone-400" />
          <h2 className="text-base font-semibold text-stone-900">Dimensione del testo</h2>
        </div>
        <p className="text-sm text-stone-500 mt-0.5">
          Ingrandisce o riduce testi, pulsanti e icone in tutta l'app. Si applica subito e vale solo per questo dispositivo.
        </p>
      </div>

      <div className="p-6 flex flex-col gap-5">
        <div role="radiogroup" aria-label="Dimensione del testo" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FONT_SCALE_LEVELS.map(level => {
            const active = level.scale === scale;
            return (
              <button
                key={level.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(level.scale)}
                className={cn(
                  'flex flex-col items-center justify-end gap-1 px-2 pt-3 pb-2.5 rounded-xl border-2 transition-all',
                  active ? 'border-stone-900 bg-stone-50 shadow-sm' : 'border-stone-100 hover:border-stone-200',
                )}
              >
                <span
                  aria-hidden
                  className="font-serif text-stone-900 leading-none"
                  style={{ fontSize: `${1.5 * level.scale ** 2}rem` }}
                >
                  A
                </span>
                <span className={cn('text-sm mt-1', active ? 'font-semibold text-stone-900' : 'font-medium text-stone-600')}>
                  {level.label}
                </span>
                <span className="text-xs text-stone-400">{Math.round(level.scale * 100)}%</span>
              </button>
            );
          })}
        </div>

        {applied < scale && (
          <p className="text-sm text-stone-600 -mt-1">
            Su questo schermo il testo arriva al {Math.round(applied * 100)}%, perché oltre la pagina non ci starebbe più. Su tablet e computer si usa la dimensione scelta.
          </p>
        )}

        <div className="border-t border-stone-100 pt-5">
          <label className="block text-xs font-medium text-stone-600 mb-3 uppercase tracking-wide">
            Anteprima
          </label>
          <div className="rounded-xl border border-stone-200 border-l-4 px-3 py-2 max-w-xs" style={{ borderLeftColor: 'var(--color-brand-primary)' }}>
            <p className="text-[0.6875rem] font-bold leading-tight opacity-80 text-stone-800">10:00 → 11:00</p>
            <p className="text-[0.8125rem] font-semibold leading-tight text-stone-800">Giulia Bianchi</p>
            <p className="text-[0.6875rem] leading-tight text-stone-800 opacity-60">Colore Base · Piega</p>
          </div>
          <p className="text-sm text-stone-600 mt-3">
            Così appare un appuntamento in agenda con la dimensione scelta.
          </p>
        </div>

        {scale !== DEFAULT_FONT_SCALE && (
          <div className="flex justify-end pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={() => choose(DEFAULT_FONT_SCALE)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Ripristina dimensione normale
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
