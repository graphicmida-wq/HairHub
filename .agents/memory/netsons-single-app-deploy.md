---
name: Netsons single-app deploy
description: Come Lumii viene buildata e pubblicata come UN solo Node app su Netsons (cPanel + MySQL); vincoli build/runtime non ovvi.
---

# Deploy Lumii — app unica (Netsons)

Regola: in produzione Lumii gira come UN SOLO processo Express che serve sia l'API
(`/api`) sia la SPA buildata. L'artefatto deployabile pre-buildato vive in `lumii-app/`
alla root del repo (NON è un pacchetto del workspace): `server/` = bundle esbuild,
`public/` = build Vite, avvio `server.js`. Deploy via Git + `npm install` + start, senza
step di build sul server. Guida utente in `DEPLOY.md`.

**Why:** l'utente è non-tecnico e vuole pubblicare come le sue app passate (repo GitHub +
terminale, niente build sul server). Un'app unica same-origin elimina i problemi di
CORS/cookie tra domini diversi.

**How to apply:** dopo modifiche al codice rigenera `lumii-app/` (build hirhub con
`BASE_PATH=/`, build api-server, copia `dist/*.mjs` → `lumii-app/server/`, `dist/public/.`
→ `lumii-app/public/`, rimuovi `.htaccess`). Poi commit/push; su Netsons `git pull` + Restart.

## Vincoli non ovvi
- **mysql2 è external nel bundle**: `build.mjs` lo mette in `external`, quindi esbuild lo
  emette come `import` statico in cima a `index.mjs`, risolto al LINK time. Deve essere
  installato (è l'unica dependency runtime in `lumii-app/package.json`) o l'app crasha
  all'avvio con `ERR_MODULE_NOT_FOUND`, anche se nel codice l'uso sembra dinamico.
- **better-sqlite3 è solo dev**: external + import dinamico in `initSqlite`, mai caricato
  quando `DB_HOST` è impostato (produzione MySQL).
- **Niente dati demo in produzione**: il seed con clienti/appuntamenti finti è gated su
  `NODE_ENV !== "production"`; in prod si garantisce solo la riga `salon_settings` +
  l'admin. Un salone reale deve partire con l'agenda vuota.
- **API base URL same-origin**: il frontend buildato senza `VITE_API_URL` usa percorsi
  relativi `/api/...` (custom-fetch ritorna l'input quando `_baseUrl` è null; i fallback
  nei componenti danno base `""` in prod). Servito dallo stesso dominio ⇒ funziona senza CORS.
- **initMysql crea tutte le tabelle** (`CREATE TABLE IF NOT EXISTS`, ordine FK) ad ogni
  avvio: idempotente, nessun `drizzle push` su un DB Netsons nuovo.
- **Cookie Secure ⇒ serve HTTPS**: senza SSL attivo sul sottodominio il login non salva
  la sessione (cookie viaggia solo su https).
