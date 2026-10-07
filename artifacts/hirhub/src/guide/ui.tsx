import React, { createContext, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lightbulb, AlertTriangle, ShieldCheck, X, ZoomIn } from 'lucide-react';
import { cn } from '../lib/utils';
import { SHOT_SIZES } from './shot-sizes';

/* Building blocks of the guide's text, so every chapter reads the same way. */

/** Numbered steps, one action each. */
export const Steps = ({ children }: { children: React.ReactNode }) => (
  <ol className="guide-steps flex flex-col gap-3 my-4">
    {React.Children.toArray(children).map((child, i) => (
      <li key={i} className="flex gap-3">
        <span
          className="guide-step-num w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--color-brand-solid)' }}
        >
          {i + 1}
        </span>
        <div className="flex-1 min-w-0 pt-0.5 leading-relaxed">{child}</div>
      </li>
    ))}
  </ol>
);

/** Name of something on screen (a button, a field, a menu item). */
export const Ui = ({ children }: { children: React.ReactNode }) => (
  <strong className="guide-ui font-semibold text-stone-900 whitespace-nowrap">«{children}»</strong>
);

const Box = ({ icon, title, tone, children }: {
  icon: React.ReactNode;
  title: string;
  tone: 'tip' | 'warn';
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      'guide-box my-4 rounded-xl border px-4 py-3 flex gap-3',
      tone === 'tip' ? 'bg-stone-50 border-stone-200' : 'bg-amber-50 border-amber-200',
    )}
  >
    <span className={cn('shrink-0 mt-0.5', tone === 'tip' ? 'text-stone-500' : 'text-amber-600')}>{icon}</span>
    <div className="flex-1 min-w-0 leading-relaxed">
      <p className={cn('font-semibold mb-0.5', tone === 'tip' ? 'text-stone-900' : 'text-amber-900')}>{title}</p>
      <div className={tone === 'tip' ? 'text-stone-700' : 'text-amber-900'}>{children}</div>
    </div>
  </div>
);

export const Tip = ({ title = 'Consiglio', children }: { title?: string; children: React.ReactNode }) => (
  <Box icon={<Lightbulb className="w-5 h-5" />} title={title} tone="tip">{children}</Box>
);

export const Warn = ({ title = 'Attenzione', children }: { title?: string; children: React.ReactNode }) => (
  <Box icon={<AlertTriangle className="w-5 h-5" />} title={title} tone="warn">{children}</Box>
);

export const AdminBadge = () => (
  <span className="guide-admin inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 align-middle">
    <ShieldCheck className="w-3.5 h-3.5" /> Solo amministratori
  </span>
);

/** Plain bullet list. */
export const List = ({ children }: { children: React.ReactNode }) => (
  <ul className="my-3 flex flex-col gap-2">
    {React.Children.toArray(children).map((child, i) => (
      <li key={i} className="flex gap-2.5 leading-relaxed">
        <span className="mt-[0.6rem] w-1.5 h-1.5 rounded-full shrink-0 bg-stone-400" />
        <div className="flex-1 min-w-0">{child}</div>
      </li>
    ))}
  </ul>
);

/** True on the print page: every screenshot loads at once, so the printout has them all. */
export const GuidePrintContext = createContext(false);

const shotUrl = (name: string) => `${import.meta.env.BASE_URL}guida/${name}.webp`;

/**
 * A screenshot of the app (public/guida/<name>.webp). Tapping it opens it full
 * screen, which helps on a phone and for anyone who needs it bigger.
 */
export const Shot = ({ name, alt, caption, phone, narrow }: {
  name: string;
  alt: string;
  caption?: React.ReactNode;
  /** Taken on a phone: shown narrower */
  phone?: boolean;
  /** A form or window (tall and narrow): shown at about its real size */
  narrow?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const printing = useContext(GuidePrintContext);
  const [width, height] = SHOT_SIZES[name] ?? [];
  return (
    <figure className={cn('guide-shot my-5', phone && 'guide-shot-phone')}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group relative block rounded-xl overflow-hidden border border-stone-200 shadow-sm bg-stone-50 mx-auto',
          'w-full', phone ? 'max-w-[18rem]' : narrow && 'max-w-[26rem]',
        )}
        aria-label={`Ingrandisci: ${alt}`}
      >
        <img src={shotUrl(name)} alt={alt} width={width} height={height} loading={printing ? 'eager' : 'lazy'} className="block w-full h-auto" />
        <span className="guide-zoom absolute bottom-2 right-2 flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-black/60 text-white opacity-90">
          <ZoomIn className="w-3.5 h-3.5" /> Ingrandisci
        </span>
      </button>
      {caption && <figcaption className="text-sm text-stone-500 text-center mt-2">{caption}</figcaption>}
      {open && <Lightbox src={shotUrl(name)} alt={alt} onClose={() => setOpen(false)} />}
    </figure>
  );
};

const Lightbox = ({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/85 flex items-center justify-center p-3 cursor-zoom-out"
      role="dialog"
      aria-label={alt}
    >
      <img src={src} alt={alt} className="max-w-full max-h-full object-contain rounded-lg" />
      <button
        onClick={onClose}
        aria-label="Chiudi"
        className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center"
      >
        <X className="w-6 h-6" />
      </button>
    </div>,
    document.body,
  );
};
