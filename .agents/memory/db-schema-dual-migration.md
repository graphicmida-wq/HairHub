---
name: DB schema — doppia migrazione (SQLite dev + MySQL prod)
description: Regola critica per Lumii — ogni nuova colonna va migrata in DUE posti o i DB Netsons già live si rompono in silenzio.
---

# Schema drift: dev SQLite vs prod MySQL

Lumii ha DUE backend dati in `artifacts/api-server/src/data/db.ts`: SQLite in dev
(switch su `process.env.DB_HOST` assente) e MySQL in prod (Netsons). Ognuno ha la sua
sequenza di migrazioni idempotenti eseguite all'avvio:
- dev: `createSqliteTables` (try/catch `ALTER TABLE ... ADD COLUMN`).
- prod: `initMysql` → blocco `migrate()` (MySQL 8 non ha `ADD COLUMN IF NOT EXISTS`,
  quindi si esegue lo statement e si ingoiano gli errori attesi errno **1060**
  ER_DUP_FIELDNAME, **1054** ER_BAD_FIELD_ERROR e **1091** ER_CANT_DROP_FIELD_OR_KEY
  (DROP di colonna/FK inesistente)).

**Regola d'oro:** ogni nuova colonna (o cambio di nullabilità/tipo) aggiunta a una tabella
va replicata in ENTRAMBE le liste. Le tabelle prod nascono da `CREATE TABLE IF NOT EXISTS`,
che NON tocca tabelle già esistenti: un DB Netsons già live resta fermo allo schema vecchio
finché non c'è un `ALTER` esplicito.

**Why:** ogni salone cliente è un DB MySQL separato e long-lived. Quando il codice ha
introdotto i servizi multipli, l'INSERT appuntamenti scriveva `service_ids` (JSON) e non
scriveva più il vecchio `service_id CHAR(12) NOT NULL`; i DB Netsons creati da build
precedenti non avevano `service_ids` e avevano `service_id` obbligatorio → l'INSERT falliva
e gli appuntamenti "non si salvavano" (i clienti sì, perché quella tabella era già allineata).
SQLite in dev aveva già le migrazioni, MySQL no → il bug era invisibile in sviluppo.

**How to apply:**
- Quando aggiungi una colonna: aggiungila in `createSqliteTables` E nel `migrate()` di
  `initMysql`. Per colonne che sostituiscono una vecchia (es. `service_ids` ↔ `service_id`)
  fai prima il backfill (`UPDATE ... JSON_ARRAY(old_col)`), poi **droppa** la vecchia colonna.
  NON usare `MODIFY old_col ... NULL` se la vecchia colonna ha una FK: MySQL rifiuta di
  alterare una colonna referenziata da una FK (errno **1832** ER_FK_CANNOT_CHANGE_COLUMN) e
  l'ALTER fallisce in silenzio → la colonna resta `NOT NULL` e ogni INSERT viene rifiutato.
  Pattern corretto: cerca il nome (auto-generato, non osservabile) della FK via
  `information_schema.KEY_COLUMN_USAGE` (filtra `TABLE_SCHEMA=DATABASE()`, `TABLE_NAME`,
  `COLUMN_NAME`, `REFERENCED_TABLE_NAME IS NOT NULL`), `DROP FOREIGN KEY <nome>` e poi
  `DROP COLUMN`. **Per leggere information_schema in una migrazione, NON usare il
  `db.execute()` di drizzle**: la forma di ritorno è ambigua e può tornare vuota in
  silenzio (→ FK non droppata → `DROP COLUMN` fallisce → colonna `NOT NULL` resta → INSERT
  rifiutato, identico al bug originale). Apri invece una connessione mysql2 dedicata
  (`import("mysql2/promise")` + `createConnection` con le stesse env `DB_HOST/USER/PASS/NAME/PORT`,
  `conn.end()` in `finally`): `conn.query()` garantisce la tupla `[rows, fields]`.
- **Heal generico delle colonne legacy:** oltre alla FK specifica, conviene rilassare in
  blocco OGNI colonna `NOT NULL` senza default che il codice non scrive più. Leggi
  `information_schema.COLUMNS` (`IS_NULLABLE='NO'`, `COLUMN_DEFAULT IS NULL`, `COLUMN_KEY<>'PRI'`,
  `EXTRA NOT LIKE '%auto_increment%'`), salta i nomi nel write-set corrente (tieni il set
  allineato 1:1 alle colonne della tabella drizzle) e fai `MODIFY <col> <COLUMN_TYPE> NULL`.
  Sicuro: rilassare a NULL non perde dati e le colonne scritte hanno sempre un valore.
  Tutto dentro try/catch annidati + un try/catch esterno con solo `logger.warn`, così lo
  startup non aborta mai (Passenger su Netsons non cattura comunque stdout/pino).
- JSON in MySQL 8 non ammette DEFAULT letterale → aggiungi le colonne JSON come nullable e
  fai il backfill a `JSON_ARRAY()` per soddisfare lo Zod `notNull string[]` in lettura.
- **Lettura JSON drizzle+mysql2 (trappola subdola):** `drizzle-orm` mysql `json()` (v0.45.2)
  override SOLO `mapToDriverValue` (write = `JSON.stringify`), NON ha `mapFromDriverValue`:
  in lettura restituisce così com'è ciò che dà mysql2. mysql2 fa il parse SOLO se la colonna
  è di tipo JSON reale → torna un array; ma una colonna **TEXT legacy** (vecchia build) torna
  una **stringa grezza**. Quindi `serviceIds` ecc. possono arrivare come stringa, lo Zod
  `array(...)` della response fallisce ("array expected, string received") e il salvataggio
  va in 500 generico (la INSERT riesce, è la rilettura+validazione a rompersi). In dev SQLite
  non si vede perché `parseApptRow` fa il JSON.parse a mano. **Regola:** ogni rilettura MySQL
  che alimenta uno Zod `array/object` deve coercere difensivo (parse-se-stringa, tieni-se-già-array)
  su TUTTI i campi JSON, non fidarti del tipo `$type<...>()` di drizzle (è solo compile-time).
  Vale per tutti i path di lettura (list, get-by-id, e le riletture dopo insert/update).
- Gli errori di `migrate()` inattesi devono andare a `logger.warn` (non `debug`): il default
  di pino è livello "info", quindi un fallimento reale a `debug` sarebbe invisibile in prod.
- Non testabile in locale (dev = SQLite): valida la SQL MySQL con revisione architect.
