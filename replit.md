# Lumii — Gestionale Salone

App web di gestione salone (clienti, agenda, servizi, magazzino) pensata per saloni italiani. Il prodotto si chiama **Lumii** (dominio `lumii.it`): ogni salone cliente viene pubblicato su un proprio sottodominio (es. `nomecliente.lumii.it`), con il nome del salone configurabile dalle Impostazioni. Il deploy finale è su hosting Netsons (cPanel + MySQL).

> Nota branding: lo slug interno del pacchetto è ancora `@workspace/hirhub` e i percorsi `artifacts/hirhub/` restano invariati (identificatori tecnici, non visibili agli utenti). Il nome utente del prodotto è **Lumii**.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — avvia il server API (porta 5000, rimappata all'8080 dal workflow)
- `pnpm --filter @workspace/hirhub run dev` — avvia il frontend React+Vite
- `pnpm run typecheck` — typecheck completo su tutti i pacchetti
- `pnpm run build` — typecheck + build
- `pnpm --filter @workspace/api-spec run codegen` — rigenera hook React Query e schemi Zod dall'OpenAPI spec
- Deploy Netsons (app unica pre-buildata in `lumii-app/`): vedi `DEPLOY.md`. Le tabelle MySQL si creano da sole al primo avvio (`initMysql`), quindi `pnpm --filter @workspace/db run push` NON è necessario.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 6 + TailwindCSS v4 (`artifacts/hirhub`)
- API: Express 5 + Pino logger (`artifacts/api-server`)
- DB schema: Drizzle ORM MySQL (`lib/db`) — solo per produzione Netsons
- Dev backend: in-memory DataStore (nessun DB necessario in Replit)
- Validazione API: Zod + drizzle-zod
- Codegen: Orval (OpenAPI spec → React Query hooks + Zod schemas)
- State: `@tanstack/react-query` per server state, `ModalStore` minimo per UI locale
- Auth: JWT in cookie httpOnly (jsonwebtoken) + hashing bcryptjs; due ruoli (admin/user); primo admin seedato al primo avvio

## Where things live

- `lib/api-spec/openapi.yaml` — contratto OpenAPI (source of truth)
- `lib/api-client-react/src/generated/` — hook React Query generati (non editare)
- `lib/api-zod/src/generated/` — schemi Zod generati (non editare)
- `lib/db/src/schema/` — schema Drizzle MySQL per produzione
- `artifacts/api-server/src/data/store.ts` — DataStore in-memory (dev seed data)
- `artifacts/api-server/src/routes/` — route Express (clients, services, products, appointments, settings)
- `artifacts/hirhub/src/pages/` — Dashboard, Agenda, Clienti, Magazzino
- `artifacts/hirhub/src/components/` — Layout, Modal*, tutti i form modali
- `artifacts/hirhub/src/lib/store.ts` — solo stato modale (isNewClientOpen ecc.)
- `artifacts/api-server/src/lib/auth.ts`, `src/middlewares/auth.ts` — hashing, JWT, guardie requireAuth/requireAdmin
- `artifacts/api-server/src/routes/auth.ts`, `routes/users.ts` — login/logout/me, gestione utenti (admin)
- `artifacts/hirhub/src/lib/auth-context.tsx`, `src/pages/Login.tsx`, `src/pages/Users.tsx` — auth frontend

## Architecture decisions

- **Contract-first API**: OpenAPI spec → Orval codegen → React Query hooks. Non scrivere fetch manualmente.
- **In-memory store per dev**: Il server usa un DataStore in-memory con dati seed. Non serve MySQL in Replit.
- **MySQL solo per produzione**: lib/db usa drizzle-orm/mysql-core per Netsons. Configurare DB_HOST, DB_USER, DB_PASS, DB_NAME prima del deploy. `initMysql()` crea tutte le tabelle (`CREATE TABLE IF NOT EXISTS`, in ordine FK) al primo avvio: nessun `drizzle push` richiesto.
- **Deploy come app unica (Netsons)**: in produzione lo stesso processo Express serve sia l'API su `/api` sia le schermate buildate. Se accanto al bundle esiste `../public/index.html` (o `STATIC_DIR`), `app.ts` monta `express.static` + fallback SPA; in dev Replit non c'è `public`, quindi resta API-only e Vite serve la UI. L'artefatto deployabile pre-buildato vive in `lumii-app/` alla root (server in `lumii-app/server/`, UI in `lumii-app/public/`, avvio `server.js`); non è un pacchetto del workspace. Same-origin ⇒ `CORS_ORIGIN` non serve. Vedi `DEPLOY.md`.
- **React Query per tutto**: nessun Zustand/Redux. Il frontend legge/scrive solo via hook generati.
- **Modal state separato**: `ModalStore` è un semplice pub/sub leggero, non fa parte del server state.
- **Auth self-contained** (no Replit Auth/Clerk, deploy Netsons): login username/password → JWT in cookie httpOnly firmato con `SESSION_SECRET` (~7gg). Guardie `requireAuth`/`requireAdmin` in `middlewares/auth.ts`; le rotte dati richiedono auth, `/users` e `PUT /settings` richiedono admin, `GET /settings` resta pubblica (branding login). Primo admin via `ensureAdminUser()` al primo avvio (env `ADMIN_USERNAME`/`ADMIN_PASSWORD`, fallback `admin`/`admin123` con warning).

## Product

- Dashboard: panoramica giornaliera (appuntamenti oggi, azioni rapide, scorte in esaurimento)
- Agenda: vista giornaliera con timeline oraria, navigazione data, gestione stato appuntamento
- Clienti: lista cercabile, scheda cliente con storico appuntamenti e allergie
- Magazzino: inventario prodotti con alert scorta minima
- Servizi: CRUD completo via API (gestibile tramite modal)
- Autenticazione: login username/password, due ruoli (admin/user); UI gating delle rotte; pulsante logout
- Utenti: gestione utenti (CRUD) riservata agli admin; voci nav Utenti/Impostazioni visibili solo agli admin
- Impostazioni salone: da implementare (task #6)

## User preferences

- Lingua interfaccia: italiano
- Stile UI: minimalista, palette stone/warm, font serif per titoli
- Target deploy: Netsons cPanel shared hosting, MySQL 8

## Gotchas

- **Non cambiare `info.title` in openapi.yaml** — controlla i percorsi dei file generati
- **Non eseguire `pnpm dev` alla root** — usa `restart_workflow` o il pannello workflow
- Dopo aver modificato openapi.yaml, eseguire sempre `pnpm --filter @workspace/api-spec run codegen`
- lib/db/drizzle.config.ts richiede DB_HOST, DB_USER, DB_NAME — non è necessario in sviluppo
- **SESSION_SECRET obbligatorio in produzione** — in dev esiste un fallback, ma con `NODE_ENV=production` il server termina se manca
- Credenziali admin di sviluppo seedate: `admin` / `admin123` (vedi log all'avvio)

## Pointers

- Skill `pnpm-workspace` per struttura workspace, TypeScript e dettagli pacchetti
- Skill `react-vite` per convenzioni React/Vite
