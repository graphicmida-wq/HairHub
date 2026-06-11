# Pubblicare Lumii su Netsons (app unica)

Questa guida pubblica Lumii sul sottodominio **capellievanita.lumii.it** usando
hosting Netsons (cPanel + MySQL). Il metodo è quello che già conosci: **repository
GitHub + terminale**.

## Cosa stai pubblicando

Una sola applicazione, già pronta all'uso, contenuta nella cartella **`lumii-app/`**
del progetto. Questa app fa due cose insieme:

- mostra le schermate del gestionale;
- gestisce e salva i dati nel database.

**Non serve "compilare" niente sul server.** Sul server basta scaricare il codice,
dare un comando per installare ed avviare. Le tabelle del database si creano da sole
al primo avvio.

La cartella `lumii-app/` contiene:

- `server.js` — il file di avvio
- `server/` — l'applicazione già pronta
- `public/` — le schermate già pronte
- `package.json` — l'elenco di ciò che il server deve installare (solo `mysql2`)

---

## Passo 1 — Crea il database MySQL (in cPanel)

1. In cPanel apri **"MySQL® Databases"**.
2. Crea un nuovo database (es. `ztatlmzd_capellievanita`). Annota il **nome completo**.
3. Crea un nuovo utente MySQL con una password robusta. Annota **utente** e **password**.
4. Nella sezione "Add User To Database" collega l'utente al database con **ALL PRIVILEGES**.

Non devi creare tabelle: ci pensa l'app al primo avvio.

## Passo 2 — Porta il codice su GitHub e poi su Netsons

1. **Da qui (Replit):** fai commit e push del progetto su GitHub (pannello Git).
2. **Su Netsons (Terminale di cPanel):** scarica il codice nella tua home:
   ```bash
   git clone <URL-del-tuo-repo-github>
   ```
   Otterrai una cartella con dentro il progetto, compresa la cartella `lumii-app`.

## Passo 3 — Crea l'app Node in cPanel

In cPanel apri **"Setup Node.js App"** → **Create Application** e imposta:

- **Node.js version:** la più recente disponibile (20 o superiore)
- **Application mode:** `Production`
- **Application root:** il percorso della cartella **`lumii-app`** dentro il repo clonato
  (es. `repo-lumii/lumii-app`)
- **Application URL:** `capellievanita.lumii.it`
- **Application startup file:** `server.js`

Poi clicca **Create**.

## Passo 4 — Imposta le variabili d'ambiente

Nella stessa schermata dell'app, sezione **"Environment variables"**, aggiungi:

| Nome | Valore | Note |
|------|--------|------|
| `NODE_ENV` | `production` | obbligatorio |
| `SESSION_SECRET` | una stringa lunga e casuale | **obbligatorio**: senza, l'app non parte |
| `DB_HOST` | `localhost` | |
| `DB_PORT` | `3306` | |
| `DB_NAME` | nome completo del database del Passo 1 | |
| `DB_USER` | utente MySQL del Passo 1 | |
| `DB_PASS` | password MySQL del Passo 1 | |
| `ADMIN_USERNAME` | il login del primo amministratore | consigliato |
| `ADMIN_PASSWORD` | una password robusta per l'admin | **consigliato** (altrimenti default `admin`/`admin123`) |

**Non impostare `PORT`**: la assegna automaticamente Netsons.
**`CORS_ORIGIN` non serve**: schermate e dati stanno sullo stesso indirizzo.

## Passo 5 — Installa e avvia

1. Nella schermata dell'app clicca **"Run NPM Install"** (installa solo `mysql2`).
2. Clicca **"Restart"** per avviare l'app.
3. Apri **https://capellievanita.lumii.it**: dovresti vedere la schermata di accesso.
4. Entra con le credenziali admin scelte (o `admin` / `admin123` se non le hai impostate)
   e **cambia subito la password**.

---

## Aggiornare l'app dopo una modifica

Quando in futuro modifichi qualcosa nel progetto, prima di pubblicare va rigenerata la
cartella pronta `lumii-app/`. Dalla root del progetto (in Replit):

```bash
# 1) ricostruisci le schermate
BASE_PATH=/ pnpm --filter @workspace/hirhub run build
# 2) ricostruisci il server
pnpm --filter @workspace/api-server run build
# 3) aggiorna la cartella pronta
rm -rf lumii-app/server lumii-app/public
mkdir -p lumii-app/server lumii-app/public
cp artifacts/api-server/dist/*.mjs lumii-app/server/
cp -r artifacts/hirhub/dist/public/. lumii-app/public/
rm -f lumii-app/public/.htaccess
```

Poi: commit + push su GitHub. **Su Netsons:** dalla cartella del repo `git pull`, quindi
**"Restart"** dell'app (e **"Run NPM Install"** solo se sono cambiate le dipendenze).

## Se qualcosa non va

- **L'app non parte:** controlla di aver impostato `SESSION_SECRET` e `NODE_ENV=production`.
- **Errore di database:** ricontrolla `DB_NAME`, `DB_USER`, `DB_PASS` e che l'utente sia
  collegato al database con tutti i privilegi.
- **L'accesso non funziona (resti sulla pagina di login):** assicurati che il sottodominio
  abbia il certificato SSL attivo (https). Il cookie di sessione viaggia solo su HTTPS:
  su `http://` (senza lucchetto) il login non può salvare la sessione. Su Netsons attiva
  l'AutoSSL per `capellievanita.lumii.it` e riprova in `https://`.
- **Pagina bianca / errori vari:** usa il log dell'app in "Setup Node.js App" per leggere
  il messaggio d'errore.
