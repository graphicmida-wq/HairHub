import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/utils';

interface Props {
  letters: string[];
  enabled: Set<string>;
  /** Letter of the section being looked at, shown a little stronger */
  current?: string | null;
  onJump: (letter: string) => void;
}

// Desktop magnification, like the macOS Dock: the letter under the mouse grows the
// most and its neighbours a little less, fading out within RADIUS pixels.
const ROW = 20;        // px per letter on desktop
const RADIUS = 70;
const MAX_SCALE = 2.1;

function magnification(distance: number): number {
  if (distance >= RADIUS) return 1;
  const t = 1 - distance / RADIUS;
  return 1 + (MAX_SCALE - 1) * t * t;
}

/** Dragging a finger (or the pressed mouse) along the bar jumps letter by letter. */
function useDragJump(enabled: Set<string>, onJump: (l: string) => void) {
  const jumpAt = (e: React.PointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const letter = el?.closest<HTMLElement>('[data-letter]')?.dataset['letter'];
    if (letter && enabled.has(letter)) onJump(letter);
  };
  return {
    onPointerDown: (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); jumpAt(e); },
    onPointerMove: (e: React.PointerEvent) => { if (e.buttons) jumpAt(e); },
  };
}

/** Phones: slim bar on the screen edge, easy to reach with the thumb. */
export const AlphabetIndexMobile = ({ letters, enabled, current, onJump }: Props) => {
  const drag = useDragJump(enabled, onJump);
  // Portal: the page wrapper is animated (transform), which would trap a fixed element
  return createPortal(
    <nav
      aria-label="Vai alla lettera"
      className="md:hidden fixed right-1 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center py-2 px-1 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-stone-200 select-none touch-none"
      {...drag}
    >
      {letters.map(letter => (
        <button
          key={letter}
          type="button"
          data-letter={letter}
          disabled={!enabled.has(letter)}
          onClick={() => onJump(letter)}
          className={cn(
            'w-6 h-[1.15rem] text-[0.6875rem] leading-none font-semibold flex items-center justify-center rounded',
            !enabled.has(letter) ? 'text-stone-300'
              : letter === current ? 'text-[var(--color-brand-dark)] bg-stone-100' : 'text-stone-800'
          )}
        >
          {letter}
        </button>
      ))}
    </nav>,
    document.body
  );
};

/** Desktop: right next to the list, stays in view while scrolling, magnifies on hover. */
export const AlphabetIndexDesktop = ({ letters, enabled, current, onJump }: Props) => {
  const [pointerY, setPointerY] = useState<number | null>(null);
  const drag = useDragJump(enabled, onJump);

  return (
    <nav
      aria-label="Vai alla lettera"
      // Tone on tone: a shade darker than the page background (lighter on dark backgrounds)
      className="hidden md:flex sticky top-4 shrink-0 flex-col items-center py-3 w-12 rounded-full bg-on-page/[0.06] select-none"
      onMouseMove={e => {
        const list = e.currentTarget.firstElementChild as HTMLElement | null;
        if (list) setPointerY(e.clientY - list.getBoundingClientRect().top);
      }}
      onMouseLeave={() => setPointerY(null)}
      {...drag}
    >
      <div className="flex flex-col items-center">
        {letters.map((letter, i) => {
          const scale = pointerY == null ? 1 : magnification(Math.abs(pointerY - (i + 0.5) * ROW));
          const active = enabled.has(letter);
          return (
            <button
              key={letter}
              type="button"
              data-letter={letter}
              disabled={!active}
              onClick={() => onJump(letter)}
              style={{
                height: ROW,
                transform: `scale(${scale})`,
                transition: 'transform 90ms ease-out',
                zIndex: Math.round(scale * 10),
              }}
              className={cn(
                'relative w-8 text-xs leading-none font-semibold flex items-center justify-center rounded origin-center transition-colors',
                !active ? 'text-on-page-muted/30 cursor-default'
                  // The letter being pointed at stands out a little more
                  : scale > 1.5 || letter === current ? 'text-on-page cursor-pointer' : 'text-on-page-muted cursor-pointer'
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
