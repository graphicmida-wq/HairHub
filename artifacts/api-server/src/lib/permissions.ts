/**
 * Sections of the app a non-admin login can be allowed to see, chosen per login
 * on the Team page. Admins always see everything. Stored on users.permissions as
 * a JSON array; NULL means every section (logins created before this existed).
 */

import type { Role } from "./auth";

export const APP_SECTIONS = ["agenda", "clienti", "servizi", "vendite", "incassi", "magazzino"] as const;
export type AppSection = (typeof APP_SECTIONS)[number];

function isSection(value: unknown): value is AppSection {
  return typeof value === "string" && (APP_SECTIONS as readonly string[]).includes(value);
}

export function parsePermissions(raw: string | null | undefined): AppSection[] {
  if (raw == null) return [...APP_SECTIONS];
  try {
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [...APP_SECTIONS];
    return APP_SECTIONS.filter((s) => list.some((v) => isSection(v) && v === s));
  } catch {
    return [...APP_SECTIONS];
  }
}

/** Canonical JSON (known sections only, in menu order) for users.permissions. */
export function serializePermissions(list: readonly string[]): string {
  return JSON.stringify(APP_SECTIONS.filter((s) => list.includes(s)));
}

export function effectivePermissions(user: { role: Role | string; permissions?: string | null }): AppSection[] {
  return user.role === "admin" ? [...APP_SECTIONS] : parsePermissions(user.permissions);
}
