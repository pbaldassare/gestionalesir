# Gestionale SIR — gestione sinistri per enti

Piccolo gestionale a tre ruoli:

- **Admin**: crea gli enti e gli utenti. Non fa altro.
- **Ufficio sinistri di un ente** (il primo è il Comune di Varese): registra i sinistri, segue la checklist documentale, applica i parametri di valutazione dell'ente, genera report e lettere.
- **Tecnico (Ufficio Strade)**: vede solo i sinistri per cui l'ufficio ha inviato la richiesta di relazione tecnica, consulta fascicolo e foto, carica foto del sopralluogo e genera la relazione precompilata.

Ogni sinistro ha un **numero interno** nel formato dell'ufficio (`0001/26`), proposto in automatico o scritto a mano, e un **flusso**: *sotto soglia (SIR)*, gestito e liquidato dall'ente, oppure *in polizza*, collegato a una polizza scelta dall'elenco con numero e nome (Impostazioni → Polizze).

Un'unica pagina di accesso (`/accedi`): il ruolo decide dove si entra.

## Flusso di lavoro di un sinistro

1. **Fascicolo** — registrazione della richiesta di risarcimento; il numero interno, se non indicato, viene assegnato dal database.
2. **Checklist** — generata dal modello dell'ente (voci generali + voci della tipologia); spunte, note e allegati per voce.
3. **Valutazione** — i parametri configurabili danno un punteggio; alcune risposte sono *ostative*. Esito **da liquidare** se nessuna condizione ostativa è scattata e il punteggio raggiunge la soglia dell'ente.
4. **Documenti** — su carta intestata (stemma e piè di pagina caricati in Impostazioni → Ente), ricalcati sui modelli dell'Ufficio Assicurazioni del Comune di Varese: avvio istruttoria, richiesta di integrazione, **scheda danno** (accoglimento o rigetto), **lettera di invio quietanza** + **atto di quietanza** (importo in lettere, caselle IBAN), comunicazione di rigetto, **richiesta di relazione tecnica** all'Area Attività Strade e **relazione tecnica** del tecnico. Anteprima in app e pagina di stampa/PDF (`/app/stampa/:id`).

Il numero di pratica compare nei documenti come "Ns. rif. n.". La valutazione comprende i testi della scheda danno (iter istruttorio, relazione del settore tecnico, verbale delle autorità) e la quantificazione: imponibile riconosciuto meno le riduzioni (evitabilità 30%, degrado d'uso 20%, altre) → stima attribuita al danno.

**Modelli modificabili**: la pagina *Modelli* (`/app/modelli`) permette a ogni ente di vedere, modificare e ripristinare i testi dei documenti. I campi `{{...}}` (mostrati come etichette nell'editor) vengono riempiti con i dati del fascicolo; i predefiniti stanno in `src/lib/modelli.ts`, le personalizzazioni nella tabella `modelli_documento`.

**Luogo del sinistro**: suggerimenti di indirizzo, geocodifica e mappa con Google Maps (`src/lib/maps.ts`); la chiave browser va limitata per referrer nella console Google Cloud.

I criteri di valutazione sono stati ricavati dalle schede danno reali e restano modificabili da **Impostazioni → Parametri di valutazione** (criteri sì/no, numerici con soglia, a scelta multipla; punti e condizioni ostative sono liberi).

## Stack

Vite + React 18 + TypeScript, Tailwind 3 + shadcn/ui, TanStack Query, Supabase (auth, Postgres con RLS, storage, edge function).

```bash
npm install
npm run dev        # http://localhost:8094
npm run typecheck
npm run build
```

Variabili in `.env` (vedi `.env.example`): URL e chiave anon del progetto, `VITE_SUPABASE_SCHEMA=gestionalesir`.

## Supabase

Progetto condiviso `uanazxrxtzcuircypklo` ("Magnet e Piattaforma assicurativa"). Tutte le tabelle vivono nello schema **`gestionalesir`**, mai in `public`.

- Migration in `supabase/migrations/` (schema + seed del Comune di Varese).
- RLS: ogni tabella di dominio è isolata per `ente_id` tramite `gestionalesir.mio_ente()`; `profili` ed `enti` distinguono admin e utenti con `gestionalesir.sono_admin()`.
- Storage: bucket privato `gestionalesir`, path `<ente_id>/<sinistro_id>/<file>`.
- Edge function `sir-admin` (`supabase/functions/sir-admin`): crea/elimina utenti, reimposta password, attiva/disattiva. Verifica che il chiamante sia un admin attivo.
- `auth.users` è condiviso con le altre app del progetto: gli utenti SIR portano `raw_user_meta_data.app = 'gestionalesir'` e il trigger `on_auth_user_created` della piattaforma broker li ignora.
- Lo schema è esposto a PostgREST via configurazione in-database (`alter role authenticator set pgrst.db_schemas`). Se il dashboard sovrascrive quell'impostazione, aggiungere `gestionalesir` in *Project Settings → API → Exposed schemas*.

Le credenziali iniziali sono in `CREDENZIALI.local.md` (non committato).
