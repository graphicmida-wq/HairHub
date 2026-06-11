# Guida al Deploy su Netsons (cPanel + MySQL)

Questa guida descrive come preparare e caricare **Lumii** su un hosting Netsons con cPanel e MySQL 8.

Lumii viene pubblicato per ogni cliente su un **sottodominio** di `lumii.it`
(es. `capellievanita.lumii.it`). Il nome del salone mostrato nell'app
(es. "Capelli&Vanità") si configura dalle **Impostazioni** dopo il primo accesso,
quindi una stessa build serve qualsiasi cliente.

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
2. Crea un nuovo database (es. `u12345_lumi`)
3. Crea un nuovo utente MySQL (es. `u12345_lumi`) con una password sicura
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
BASE_PATH=/ pnpm --filter @workspace/hirhub run build
```

> **Consigliato (stesso sottodominio):** tieni frontend e API sullo **stesso
> sottodominio** del cliente, con l'API su `/api` (es. frontend su
> `https://capellievanita.lumii.it` e API su `https://capellievanita.lumii.it/api`).
> In questo caso **ometti `VITE_API_URL`**: il frontend chiama `/api` in modo
> relativo e i cookie di sessione funzionano senza configurazioni extra. Questa è la
> configurazione più semplice e la raccomandata per ogni cliente.

Solo se l'API è su un host/sottodominio **diverso** dal frontend, indica l'URL completo:

```bash
VITE_API_URL=https://api.lumii.it \
BASE_PATH=/ \
pnpm --filter @workspace/hirhub run build
```

In quel caso ricordati di impostare anche `CORS_ORIGIN` lato backend (vedi Step 6).

La build produce la cartella: `artifacts/hirhub/dist/public/`

---

## Step 3 — Upload del frontend su Netsons

1. In cPanel crea prima il **sottodominio** del cliente (cPanel → **Domini/Sottodomini**),
   es. `capellievanita` su `lumii.it`. cPanel crea una cartella radice dedicata
   (document root), tipicamente `public_html/capellievanita/`.
2. Accedi a cPanel → **File Manager** (oppure usa un client FTP come FileZilla)
3. Naviga nella **document root del sottodominio** (es. `public_html/capellievanita/`)
4. Carica **il contenuto** di `artifacts/hirhub/dist/public/` direttamente in quella cartella
   - Include il file `.htaccess` (già configurato per il routing SPA)
   - Include `index.html`, `assets/`, ecc.

> **Attenzione:** Carica il *contenuto* della cartella, non la cartella stessa.

Il file `.htaccess` incluso reindirizza tutte le route a `index.html` (necessario per
React Router) **escludendo** le chiamate API su `/api` (gestite dall'app Node.js):

```apache
Options -MultiViews
RewriteEngine On
# Non intercettare le chiamate API (gestite dall'app Node.js / Passenger su /api)
RewriteCond %{REQUEST_URI} !^/api
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
```

> **⚠️ Importante (Passenger/Node.js Selector):** quando crei l'app Node.js (Step 5)
> con Application URL `nomecliente.lumii.it/api`, cPanel **aggiunge automaticamente
> alcune righe `Passenger…` nello stesso `.htaccess`** della document root del
> sottodominio. Se carichi il `.htaccess` del frontend **dopo** aver creato l'app
> Node.js, **non sovrascrivere quelle righe**: aprilo nel File Manager e **unisci** il
> contenuto (mantieni sia le righe `Passenger…` di cPanel sia le righe `RewriteRule`
> qui sopra). In alternativa, carica prima il frontend e crea l'app Node.js dopo.
> Se `/api` smette di rispondere dopo l'upload, è quasi sempre questa la causa.

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
   - **Application root**: percorso alla cartella dell'app (es. `/home/u12345/lumi-api`)
   - **Application URL**: imposta il **sottodominio del cliente + `/api`**
     (es. `capellievanita.lumii.it/api`). Così l'API risponde sullo stesso
     sottodominio del frontend, sotto `/api`, e i cookie di sessione funzionano
     senza CORS né `SameSite=None`.
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
| `DB_NAME` | Nome del database | `u12345_lumi` |
| `DB_USER` | Utente MySQL | `u12345_lumi` |
| `DB_PASS` | Password MySQL | `password-sicura` |
| `CORS_ORIGIN` | Origini consentite per CORS (dominio del frontend) | `https://tuodominio.it` |
| `NODE_ENV` | Modalità produzione | `production` |
| `SESSION_SECRET` | Segreto per firmare i token di sessione (JWT). **Obbligatorio in produzione: senza, il server non si avvia.** | stringa lunga e casuale (32+ caratteri) |
| `ADMIN_USERNAME` | Nome utente del **primo** amministratore, creato solo al primo avvio | `admin` |
| `ADMIN_PASSWORD` | Password del **primo** amministratore, creata solo al primo avvio | `password-sicura` |

> **Nota CORS_ORIGIN:** Se il frontend è su `https://www.tuodominio.it` e anche su
> `https://tuodominio.it`, elenca entrambi separati da virgola:
> `CORS_ORIGIN=https://tuodominio.it,https://www.tuodominio.it`

> **Nota SESSION_SECRET:** Genera un valore casuale, ad esempio con
> `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
> Non cambiarlo dopo il deploy, altrimenti tutte le sessioni attive vengono invalidate
> (gli utenti dovranno rifare il login). In produzione il server termina con errore
> se la variabile non è impostata.

> **Nota autenticazione e cookie:** La sessione viene gestita con un cookie `httpOnly`
> firmato (JWT). Il cookie è marcato `Secure` in produzione, quindi il sito **deve**
> essere servito via HTTPS, ed è `SameSite=Lax`. Per far funzionare il login senza
> complicazioni, tieni frontend e API sullo **stesso dominio** con l'API raggiungibile
> su `/api` (vedi Step 2). Configurazioni cross-domain richiederebbero `SameSite=None`.
> In produzione, se `CORS_ORIGIN` non è impostato le richieste cross-origin vengono
> **bloccate** (default sicuro): impostalo solo se frontend e API sono su domini diversi.

> **Nota sicurezza login:** L'app non implementa rate limiting sul login. Per un salone
> con pochi utenti è accettabile, ma se l'app è esposta pubblicamente valuta una
> protezione anti-brute-force a livello di hosting (es. mod_security/fail2ban su cPanel)
> e usa password robuste (minimo 8 caratteri, già imposto lato server).

---

## Step 7 — Inizializzare il database e il primo amministratore

Al primo avvio, il server crea automaticamente le tabelle necessarie
(tramite `initDb()` in `artifacts/api-server/src/data/db.ts`), inclusa la tabella `users`.

Sempre al primo avvio, **se la tabella `users` è vuota**, il server crea un account
amministratore usando `ADMIN_USERNAME` / `ADMIN_PASSWORD` (vedi Step 6). Se queste
variabili non sono impostate, viene creato un admin di default `admin` / `admin123`
con un avviso nei log: **cambia subito la password** dopo il primo login (dalla pagina
Utenti, voce visibile solo agli amministratori).

> La creazione dell'admin avviene **una sola volta**: se in seguito modifichi
> `ADMIN_USERNAME`/`ADMIN_PASSWORD`, l'account esistente non viene toccato. Per
> reimpostare le credenziali usa la pagina Utenti da un account admin.

Se vuoi applicare lo schema Drizzle manualmente:

```bash
DB_HOST=localhost DB_NAME=u12345_lumi DB_USER=u12345_lumi DB_PASS=password \
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

1. Apri `https://nomecliente.lumii.it` → deve caricare la schermata di login Lumii
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
