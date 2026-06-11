---
name: iOS PWA safe-area / mobile layout
description: Rules so the installed iPhone PWA header and bottom-nav don't clip content
---

# iOS PWA safe-area & fixed-nav layout (hirhub mobile)

The mobile shell lives in `artifacts/hirhub/src/components/Layout.tsx`; safe-area
helpers in `src/index.css`.

## Rules
- The scrollable `<main>` must reserve space for the **fixed** bottom nav, or the
  last content is unreachable / hidden behind the menu. Use `.pb-mobile-nav`
  (mobile-only media query) = `calc(<nav-height> + env(safe-area-inset-bottom) + gap)`.
- The mobile header needs `padding-top: calc(env(safe-area-inset-top) + extra)`
  (raw inset alone makes the logo hug the status bar/notch). Extra ≈ 0.875rem.
- `viewport-fit=cover` must stay in `index.html` or `env(safe-area-inset-*)`
  resolves to 0 and all of this silently does nothing.

**Why:** in iOS standalone PWA the webview spans under the status bar and home
indicator, and the bottom nav is `position:fixed` (overlays the scroll area).
Reported by the user as "logo tocca il bordo" + "non scorre fino in fondo / il
menu nasconde le cose".

**How to apply:**
- If you change the bottom nav height (currently `h-[72px]`), update the `72px`
  constant in `.pb-mobile-nav` in lockstep.
- Tailwind v4 emits utilities in `@layer utilities`; `.pb-mobile-nav` is
  *unlayered* author CSS, so it reliably beats `p-6`'s padding-bottom — keep it
  unlayered.
- Any new page that introduces its own scroll container or its own fixed element
  must replicate both the bottom reserve and the safe-area top padding.
- The **Login page is OUTSIDE Layout** — it needs its own safe-area treatment if
  the same clipping shows up there.
- Not verifiable in Replit dev (no service worker, no notch, insets=0); only
  confirmable on the deployed Netsons PWA on a real iPhone.
