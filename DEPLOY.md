# Guida al Deploy su Netsons (cPanel + MySQL)

Questa guida descrive come preparare e caricare HirHub su un hosting Netsons con cPanel e MySQL 8.

---

## Prerequisiti

- Accesso cPanel Netsons con Node.js Selector abilitato
- Database MySQL creato su Netsons (annotare host, nome, utente e password)
- Node.js 20+ disponibile nel Node.js Selector
- `pnpm` installato sulla macchina di build (questa macchina Replit è già configurata)

---

## Struttura del deploy

| Componente | Dove va | Come |
|---|---|---|
| Frontend React (build statica) | `public_html/` di Netsons | Upload via FTP o File Manager |
| Backend Express | cartella dell'app Node.js su Netsons | Upload via FTP, poi avvio con cPanel |

---

## Step 1 — Creare il database MySQL su Netsons

1. Accedi a cPanel → **Database MySQL**
2. Crea un nuovo database (es. `u12345_hirhub`)
3. Crea un nuovo utente MySQL (es. `u12345_hirhub`) con una password sicura
4. Assegna all'utente **tutti i privilegi** sul database appena creato
5. Annota:
   - **DB_HOST**: solitamente `localhost`
   - **DB_PORT**: `3306`
   - **DB_NAME**: nome del database creato
   - **DB_USER**: nome dell'utente MySQL
   - **DB_PASS**: password dell'utente MySQL

---

## Step 2 — Build del frontend

Dalla directory del progetto su Replit (o sulla tua macchina locale):

```bash
VITE_API_URL=https://TUO-DOMINIO.it/api \
BASE_PATH=/ \
pnpm --filter @workspace/hirhub run build
```

Sostituisci `https://TUO-DOMINIO.it/api` con l'URL reale della tua API su Netsons.

> **Nota:** Se il frontend e il backend sono sullo stesso dominio e l'API è raggiungibile
> su `/api`, puoi omettere `VITE_API_URL` e usare solo `BASE_PATH=/`.

La build produce la cartella: `artifacts/hirhub/dist/public/`

---

## Step 3 — Upload del frontend su Netsons

1. Accedi a cPanel → **File Manager** (oppure usa un client FTP come FileZilla)
2. Naviga nella cartella `public_html/`
3. Carica **il contenuto** di `artifacts/hirhub/dist/public/` direttamente in `public_html/`
   - Include il file `.htaccess` (già configurato per il routing SPA)
   - Include `index.html`, `assets/`, ecc.

> **Attenzione:** Carica il *contenuto* della cartella, non la cartella stessa.

Il file `.htaccess` incluso reindirizza tutte le route a `index.html` (necessario per React Router):

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
```

---

## Step 4 — Build del backend

```bash
pnpm --filter @workspace/api-server run build
```

La build produce la cartella: `artifacts/api-server/dist/`

---

## Step 5 — Upload del backend su Netsons

1. Accedi a cPanel → **Node.js Selector** → **Create Application**
2. Configura:
   - **Node.js version**: 20.x o superiore
   - **Application mode**: Production
   - **Application root**: percorso alla cartella dell'app (es. `/home/u12345/hirhub-api`)
   - **Application URL**: (opzionale, se vuoi un sottodominio tipo `api.tuodominio.it`)
   - **Application startup file**: `server.js`
3. Carica i seguenti file/cartelle nella Application root:
   - `artifacts/api-server/dist/` → `dist/`
   - `artifacts/api-server/server.js`
   - `artifacts/api-server/package.json`
   - `lib/api-zod/` → `node_modules/@workspace/api-zod/` (o esegui `pnpm install` sul server)
4. Nella sezione **Environment Variables** del Node.js Selector, imposta le variabili (vedi Step 6)
5. Clicca **Run NPM Install** se necessario
6. Clicca **Restart** per avviare l'app

> **Alternativa semplificata:** Se la struttura delle dipendenze è complessa,
> puoi effettuare il bundle completo con `pnpm --filter @workspace/api-server run build`
> che già esternalizza le dipendenze native. Dovrai comunque installare le dipendenze
> native (`better-sqlite3`, `mysql2`) con npm sul server.

---

## Step 6 — Variabili d'ambiente (backend)

Imposta queste variabili nel **Node.js Selector → Environment Variables**:

| Variabile | Descrizione | Esempio |
|---|---|---|
| `PORT` | Porta su cui gira il server Express | `3000` |
| `DB_HOST` | Host del database MySQL | `localhost` |
| `DB_PORT` | Porta MySQL | `3306` |
| `DB_NAME` | Nome del database | `u12345_hirhub` |
| `DB_USER` | Utente MySQL | `u12345_hirhub` |
| `DB_PASS` | Password MySQL | `password-sicura` |
| `CORS_ORIGIN` | Origini consentite per CORS (dominio del frontend) | `https://tuodominio.it` |
| `NODE_ENV` | Modalità produzione | `production` |

> **Nota CORS_ORIGIN:** Se il frontend è su `https://www.tuodominio.it` e anche su
> `https://tuodominio.it`, elenca entrambi separati da virgola:
> `CORS_ORIGIN=https://tuodominio.it,https://www.tuodominio.it`

---

## Step 7 — Inizializzare il database MySQL

Al primo avvio, il server creerà automaticamente le tabelle necessarie
(tramite `initDb()` in `artifacts/api-server/src/data/db.ts`).

Se vuoi applicare lo schema Drizzle manualmente:

```bash
DB_HOST=localhost DB_NAME=u12345_hirhub DB_USER=u12345_hirhub DB_PASS=password \
pnpm --filter @workspace/db run push
```

---

## Riepilogo variabili d'ambiente per la BUILD del frontend

| Variabile | Descrizione | Esempio |
|---|---|---|
| `VITE_API_URL` | URL completo dell'API backend (se diverso dall'origine) | `https://api.tuodominio.it` |
| `BASE_PATH` | Base path del frontend | `/` |

---

## Verifica del deploy

1. Apri `https://tuodominio.it` → deve caricare la dashboard HirHub
2. Naviga tra le pagine (Agenda, Clienti, ecc.) → il routing SPA deve funzionare
3. Crea un nuovo cliente → deve salvare correttamente via API
4. Controlla i log del server in cPanel → Node.js Selector → Logs

---

## Problemi comuni

| Problema | Causa | Soluzione |
|---|---|---|
| Pagina bianca dopo ricarica | `.htaccess` non caricato o mod_rewrite disabilitato | Verifica che `.htaccess` sia in `public_html/` e contatti il supporto Netsons |
| Errore CORS | `CORS_ORIGIN` non configurato correttamente | Aggiungi il dominio esatto del frontend in `CORS_ORIGIN` |
| API non raggiungibile | `VITE_API_URL` sbagliato nella build | Ricostruisci il frontend con il valore corretto |
| Database connection error | Credenziali MySQL errate | Verifica `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` |
| 500 Internal Server Error | Il server non è avviato | Controlla i log in Node.js Selector |
