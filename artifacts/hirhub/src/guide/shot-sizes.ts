/**
 * Width and height of each screenshot in public/guida, so the page keeps their
 * room before they load (otherwise links to a topic land in the wrong place).
 * Regenerate when the screenshots change.
 */
export const SHOT_SIZES: Record<string, [number, number]> = {
  'agenda-anteprima': [780, 1688],
  'agenda-giorno': [1600, 1000],
  'agenda-hover': [1600, 1000],
  'agenda-settimana': [1600, 1000],
  'appuntamento-completa': [960, 2280],
  'appuntamento-dettagli': [960, 1336],
  'appuntamento-nuovo': [960, 1732],
  'cliente-nuovo': [960, 1224],
  'cliente-scheda': [1600, 2233],
  'clienti': [1600, 1000],
  'dashboard': [1600, 1000],
  'impostazioni-catalogo': [1600, 1113],
  'impostazioni-testo': [1600, 656],
  'incassi': [1600, 1000],
  'login': [1200, 1440],
  'magazzino-marche': [1600, 1000],
  'magazzino-prodotti': [1600, 1000],
  'menu': [1600, 1000],
  'prodotto-modifica': [960, 2084],
  'prodotto-nuovo': [960, 1608],
  'servizi': [1600, 1000],
  'servizio-nuovo': [960, 1280],
  'team-persona': [960, 2236],
  'team': [1600, 1000],
  'vendita-nuova': [960, 1668],
  'vendite': [1600, 1000],
};
