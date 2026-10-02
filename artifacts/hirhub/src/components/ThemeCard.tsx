import React from 'react';
import { SunMoon } from 'lucide-react';
import { cn } from '../lib/utils';
import type { BrandPalette } from '../lib/brand-color';
import { applyTheme, saveTheme, useTheme, type ThemeMode } from '../lib/theme';

/** Tiny picture of the app (sidebar, two cards, a button) in one of the two looks */
const MiniApp = ({ mode, palette, pageBackground }: { mode: ThemeMode; palette: BrandPalette; pageBackground: string }) => {
  const premium = mode === 'premium';
  const card: React.CSSProperties = premium
    ? {
        backgroundColor: 'rgb(255 255 255 / 0.06)',
        border: '1px solid color-mix(in srgb, var(--pm-neon) 25%, rgb(255 255 255 / 0.1))',
      }
    : { backgroundColor: '#ffffff', border: '1px solid #e8e3d8' };
  const line = premium ? 'rgb(255 255 255 / 0.22)' : '#e2ded6';
  return (
    <div
      aria-hidden
      className="w-full h-24 rounded-lg overflow-hidden flex"
      style={{
        background: premium
          ? 'radial-gradient(ellipse 80% 70% at 100% 0%, color-mix(in srgb, var(--pm-neon-2) 22%, transparent), transparent 70%), linear-gradient(160deg, var(--pm-bg-1), var(--pm-bg-0) 70%)'
          : pageBackground,
      }}
    >
      <div
        className="w-[22%] flex flex-col gap-1.5 px-1.5 pt-3"
        style={{ backgroundColor: premium ? 'rgb(0 0 0 / 0.2)' : palette.dark }}
      >
        <span
          className="h-1.5 rounded-full"
          style={premium
            ? { backgroundColor: 'color-mix(in srgb, var(--pm-neon) 45%, transparent)', boxShadow: '0 0 6px var(--pm-neon)' }
            : { backgroundColor: 'rgba(245,240,227,0.35)' }}
        />
        {[0, 1, 2].map(i => (
          <span key={i} className="h-1.5 rounded-full" style={{ backgroundColor: premium ? 'rgb(255 255 255 / 0.15)' : 'rgba(245,240,227,0.15)' }} />
        ))}
      </div>
      <div className="flex-1 p-2 flex flex-col gap-1.5">
        <div className="flex gap-1.5 flex-1">
          {[0, 1].map(i => (
            <div key={i} className="flex-1 rounded-md p-1.5 flex flex-col justify-between" style={card}>
              <span className="block h-1 w-1/2 rounded-full" style={{ backgroundColor: line }} />
              {premium ? (
                <svg viewBox="0 0 40 12" className="w-full h-3" preserveAspectRatio="none">
                  <path
                    d={i === 0 ? 'M0,10 C8,10 10,4 18,6 S30,2 40,1' : 'M0,9 C6,6 12,9 20,5 S32,4 40,2'}
                    fill="none"
                    stroke={i === 0 ? 'var(--pm-shade-1)' : 'var(--pm-shade-4)'}
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              ) : (
                <span className="block h-2 w-2/3 rounded-full" style={{ backgroundColor: palette.dark, opacity: 0.8 }} />
              )}
            </div>
          ))}
        </div>
        <span
          className="self-end h-3 w-12 rounded-full"
          style={premium
            ? { backgroundImage: 'linear-gradient(120deg, var(--pm-solid), var(--pm-solid-2))', boxShadow: '0 0 8px -1px var(--pm-neon)' }
            : { backgroundColor: palette.dark }}
        />
      </div>
    </div>
  );
};

const OPTIONS: { mode: ThemeMode; label: string; description: string }[] = [
  { mode: 'premium', label: 'Premium scuro', description: 'Vetro scuro e luci nel colore principale' },
  { mode: 'classico', label: 'Classico', description: "Chiaro, l'aspetto di prima" },
];

/** Impostazioni → Aspetto: classic or Premium look, applied at once, saved on this device. */
export const ThemeCard = ({ palette, pageBackground }: { palette: BrandPalette; pageBackground: string }) => {
  const mode = useTheme();

  const choose = (value: ThemeMode) => {
    applyTheme(value);
    saveTheme(value);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <SunMoon className="w-4 h-4 text-stone-400" />
          <h2 className="text-base font-semibold text-stone-900">Aspetto</h2>
        </div>
        <p className="text-sm text-stone-500 mt-0.5">
          Si applica subito e vale solo per questo dispositivo: puoi tornare all'aspetto Classico in qualsiasi momento.
        </p>
      </div>

      <div className="p-6 flex flex-col gap-4">
        <div role="radiogroup" aria-label="Aspetto" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPTIONS.map(option => {
            const active = option.mode === mode;
            return (
              <button
                key={option.mode}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => choose(option.mode)}
                className={cn(
                  'flex flex-col gap-3 p-3 rounded-xl border-2 text-left transition-all',
                  active ? 'border-stone-900 bg-stone-50 shadow-sm' : 'border-stone-100 hover:border-stone-200',
                )}
              >
                <MiniApp mode={option.mode} palette={palette} pageBackground={pageBackground} />
                <span className="flex flex-col px-1">
                  <span className={cn('text-sm', active ? 'font-semibold text-stone-900' : 'font-medium text-stone-700')}>
                    {option.label}
                  </span>
                  <span className="text-xs text-stone-500">{option.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        {mode === 'premium' && (
          <p className="text-sm text-stone-600">
            Con l'aspetto Premium il fondo scuro nasce dal colore principale scelto qui sotto; lo sfondo chiaro si usa solo con il Classico.
            I colori dei servizi, del team e delle marche restano quelli che hai scelto.
          </p>
        )}
      </div>
    </div>
  );
};
