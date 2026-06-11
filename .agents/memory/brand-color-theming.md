---
name: Brand color theming (Lumii)
description: How the salon brand color is applied, why a retired default is normalized to null, and the flash-prevention coupling between main.tsx and App.tsx
---

# Brand color theming

The brand palette drives the CSS custom properties `--color-brand-*` (login background, header, icon backgrounds, buttons). The default palette is `BRAND_PRESETS[0]` (exported as `DEFAULT_PALETTE`) in `artifacts/hirhub/src/lib/brand-color.ts`, and the same values are hard-coded in `index.css` so a cold load with no JS still renders the default.

## Retired-default normalization

**Rule:** when the default brand color changes, the *previous* default must be normalized to `null` at read time in the API (`normalizeBrandColor()` in `db.ts`, applied in BOTH `dbGetSettings` return branches).

**Why:** the stored value lives in prod MySQL (and dev SQLite). Salons that never picked a color may still have the old default persisted from earlier seeds/testing. Mapping the retired default → `null` makes the live site show the new default with no data migration.

**How to apply:** keep a `LEGACY_DEFAULT_BRAND` constant; if `brandColor === LEGACY_DEFAULT_BRAND`, return `null`. Trade-off: a salon deliberately re-picking that exact hex via the custom picker silently gets the new default — acceptable since the old preset no longer exists in the UI.

## Flash-prevention coupling (main.tsx ↔ App.tsx)

**Rule:** `BrandColorSync` (App.tsx) must `if (!settings) return;` before doing anything — especially before any reset-to-default that also writes localStorage via `saveBrandPalette`.

**Why:** `main.tsx` calls `applyBrandPalette(loadBrandPalette())` at boot from localStorage to prevent a color flash before the settings query resolves. If `BrandColorSync` applies+saves the default while `settings` is still `undefined`, it clobbers that cached palette and a custom-color salon flashes the default on every load.

**How to apply:** only act once settings have loaded; then apply the saved/derived palette, or reset to `DEFAULT_PALETTE` only when `settings.brandColor` is genuinely empty (this also clears any stale inline override left in the DOM during an in-session color change).
