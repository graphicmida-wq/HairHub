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
- **initMysql crea tabelle + migra colonne** ad ogni avvio: prima `CREATE TABLE IF NOT
  EXISTS` (ordine FK), poi un blocco `migrate()` di `ALTER TABLE ... ADD COLUMN` idempotenti.
  Tutto idempotente, nessun `drizzle push` su un DB Netsons. Per il vincolo critico vedi
  [db-schema-dual-migration](db-schema-dual-migration.md).
- **Cookie Secure ⇒ serve HTTPS**: senza SSL attivo sul sottodominio il login non salva
  la sessione (cookie viaggia solo su https).
- **La SPA è una PWA (vite-plugin-pwa)**: `sw.js` + `manifest.webmanifest` + `registerSW.js`
  + il precache manifest dentro `sw.js` devono restare allineati con `index.html` (hash degli
  asset). Quindi ad ogni deploy ricopia TUTTO `dist/public` in `lumii-app/public`, mai singoli
  file, altrimenti il service worker serve una versione stale. `mysql2` resta external, ma le
  icone/manifest sono file statici serviti da `express.static` (esistono fisicamente in public).
  autoUpdate + skipWaiting + clientsClaim ⇒ dopo `git pull` + Restart il nuovo SW si attiva
  entro 1-2 refresh (l'utente può vedere la versione vecchia per un solo caricamento).

## Push su GitHub: lo fa l'utente, non l'agente

Il push a `origin` (github.com/graphicmida-wq/HairHub) NON è eseguibile dall'ambiente agente/task: manca la credenziale GitHub, quindi `git push` via CLI fallisce ("Password authentication is not supported"). In main agent i comandi git distruttivi/lock sono pure bloccati dal sandbox (anche `git fetch` può inciampare su `objects/maintenance.lock`).

**Why:** GitHub richiede OAuth/token; l'ambiente isolato non porta con sé la connessione GitHub dell'utente.

**How to apply:** non ri-tentare il push automatico né riproporre l'integrazione GitHub se l'utente l'ha già rifiutata — l'utente pubblica dal **pannello Git di Replit** (flusso normale, vedi DEPLOY.md). Per verificare l'allineamento del remoto in sola lettura usa `git ls-remote --heads origin main` (niente lock, ma richiede comunque rete/credenziali: può fallire dall'ambiente isolato). Poi lato Netsons: `git pull` + Restart.
