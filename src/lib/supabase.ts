import { createClient } from "@supabase/supabase-js";

// URL e chiave anon sono pubblici per natura (finiscono comunque nel bundle): i valori
// predefiniti permettono alla build di funzionare anche senza variabili d'ambiente.
// La sicurezza dei dati è affidata alle policy RLS, non a questa chiave.
const url = (import.meta.env.VITE_SUPABASE_URL as string) || "https://uanazxrxtzcuircypklo.supabase.co";
const key =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVhbmF6eHJ4dHpjdWlyY3lwa2xvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwMTQ5MDYsImV4cCI6MjA3MjU5MDkwNn0.-KovUiJGtc_rMQ3uk63ZBSDXS40ZIqoxPgaYvQ2VyDM";

// Il gestionale convive con altre app nello stesso progetto Supabase:
// tutte le sue tabelle stanno nello schema `gestionalesir`, mai in `public`.
export const SCHEMA = (import.meta.env.VITE_SUPABASE_SCHEMA as string) || "gestionalesir";

export const supabase = createClient(url, key, {
  db: { schema: SCHEMA },
  auth: { persistSession: true, autoRefreshToken: true, storage: localStorage },
});

export const FUNCTIONS_URL = `${url}/functions/v1`;
