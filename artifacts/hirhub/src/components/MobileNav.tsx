import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFontScale } from '../lib/font-scale';

export interface MobileNavItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

/** Scrolled down this far past the turning point, the pill closes; scrolled up as much, it opens again. */
const TOGGLE_DISTANCE = 16;
/** Always open this close to the top of the page */
const TOP_ZONE = 24;
/** Width of an item in the open pill, in rem, when they all fit */
const ITEM_REM = 4.25;

/**
 * Open/closed state of the bottom nav pill, driven by the page's vertical
 * scroll: closed while scrolling down, open again when scrolling up or back at
 * the top. Pass `onScroll` to the scrolling element.
 */
export function useCompactOnScroll(resetKey: string) {
  const [compact, setCompact] = useState(false);
  const state = useRef({ compact: false, turn: 0 });

  const set = (value: boolean, y: number) => {
    state.current = { compact: value, turn: y };
    setCompact(value);
  };

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const el = e.currentTarget;
    // Clamped, so the iOS bounce past the end doesn't read as scrolling back up
    const y = Math.min(Math.max(el.scrollTop, 0), el.scrollHeight - el.clientHeight);
    const s = state.current;
    if (y <= TOP_ZONE) {
      if (s.compact) set(false, y);
      else s.turn = y;
    } else if (s.compact) {
      if (y > s.turn) s.turn = y;
      else if (s.turn - y > TOGGLE_DISTANCE) set(false, y);
    } else {
      if (y < s.turn) s.turn = y;
      else if (y - s.turn > TOGGLE_DISTANCE) set(true, y);
    }
  }, []);

  // A new page starts with the pill open
  useEffect(() => { set(false, 0); }, [resetKey]);

  return { compact, onScroll };
}

interface MobileNavProps {
  items: MobileNavItem[];
  isActive: (path: string) => boolean;
  compact: boolean;
  onNavigate: () => void;
}

/**
 * Phone bottom nav: a floating glass pill. Open, it shows icons with labels and
 * scrolls sideways when they don't all fit; closed, only the icons, close together.
 */
export const MobileNav = ({ items, isActive, compact, onNavigate }: MobileNavProps) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ left: false, right: false });
  const [itemWidth, setItemWidth] = useState<number>();
  const scale = useFontScale();
  const activePath = items.find(item => isActive(item.path))?.path;

  // When the items don't all fit, they share the room so that half of the next
  // one always peeks out at the edge: a hint that the pill scrolls sideways.
  const updateItemWidth = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const cs = getComputedStyle(wrap);
    // Screen width minus the side margins, the pill's border and its inner padding (p-1.5)
    const room = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2 - 0.75 * remPx;
    const base = ITEM_REM * remPx;
    const fit = Math.floor(room / base);
    setItemWidth(fit >= items.length ? base : room / (fit + 0.5));
  }, [items.length]);

  useLayoutEffect(() => {
    updateItemWidth();
    const ro = new ResizeObserver(updateItemWidth);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [updateItemWidth, scale]);

  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setFade(f => (f.left === left && f.right === right ? f : { left, right }));
  }, []);

  // Size changes while opening/closing, and on rotation or text size change
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateFade);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [updateFade]);

  // Bring the current page's item into view
  useEffect(() => {
    const el = scrollRef.current;
    const active = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !active) return;
    el.scrollTo({ left: active.offsetLeft - (el.clientWidth - active.offsetWidth) / 2, behavior: 'smooth' });
  }, [activePath]);

  const edge = '1.25rem';
  const mask = fade.left || fade.right
    ? `linear-gradient(to right, ${fade.left ? 'transparent' : '#000'}, #000 ${edge}, #000 calc(100% - ${edge}), ${fade.right ? 'transparent' : '#000'})`
    : undefined;

  return (
    <div
      ref={wrapRef}
      className="md:hidden fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pointer-events-none"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <nav
        aria-label="Menu principale"
        className="nav-glass pointer-events-auto max-w-full min-w-0 overflow-hidden rounded-full border border-white/10 shadow-[0_10px_30px_-6px_rgba(0,0,0,0.45)]"
      >
        <div
          ref={scrollRef}
          onScroll={updateFade}
          className="overflow-x-auto no-scrollbar overscroll-x-contain"
          style={{ maskImage: mask, WebkitMaskImage: mask }}
        >
          <div className="flex w-max p-1.5">
            {items.map(item => {
              const active = item.path === activePath;
              const color = active ? '#F5F0E3' : 'var(--color-brand-muted)';
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={active ? 'page' : undefined}
                  onClick={onNavigate}
                  className={cn(
                    'flex flex-col items-center justify-center shrink-0 rounded-full active:scale-95',
                    'transition-[width,height,transform] duration-300 ease-out motion-reduce:transition-none',
                    compact ? 'w-10 h-11' : 'h-14',
                  )}
                  style={compact ? undefined : { width: itemWidth ?? `${ITEM_REM}rem` }}
                >
                  <item.icon className="w-[1.375rem] h-[1.375rem] shrink-0 transition-colors" style={{ color }} />
                  <span
                    className={cn(
                      'text-[0.6875rem] leading-none whitespace-nowrap overflow-hidden',
                      'transition-[max-height,opacity,margin] duration-300 ease-out motion-reduce:transition-none',
                      active ? 'font-semibold' : 'font-medium',
                      compact ? 'max-h-0 opacity-0 mt-0' : 'max-h-4 opacity-100 mt-1.5',
                    )}
                    style={{ color }}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
};
