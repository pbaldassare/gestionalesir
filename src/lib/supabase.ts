import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Il gestionale convive con altre app nello stesso progetto Supabase:
// tutte le sue tabelle stanno nello schema `gestionalesir`, mai in `public`.
export const SCHEMA = (import.meta.env.VITE_SUPABASE_SCHEMA as string) || "gestionalesir";

export const supabase = createClient(url, key, {
  db: { schema: SCHEMA },
  auth: { persistSession: true, autoRefreshToken: true, storage: localStorage },
});

export const FUNCTIONS_URL = `${url}/functions/v1`;
