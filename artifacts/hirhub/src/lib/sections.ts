import type { AppSection } from '@workspace/api-client-react';

/** Sections a non-admin login can be allowed to see (Team page), in menu order. */
export const SECTIONS: { key: AppSection; label: string; hint?: string }[] = [
  { key: 'agenda', label: 'Agenda' },
  { key: 'clienti', label: 'Clienti' },
  { key: 'servizi', label: 'Servizi' },
  { key: 'vendite', label: 'Vendite' },
  { key: 'incassi', label: 'Incassi', hint: 'anche il fatturato in Dashboard' },
  { key: 'magazzino', label: 'Magazzino' },
];

/** Starting point for a new login: everything except the salon's takings. */
export const DEFAULT_USER_SECTIONS: AppSection[] = ['agenda', 'clienti', 'servizi', 'vendite', 'magazzino'];
