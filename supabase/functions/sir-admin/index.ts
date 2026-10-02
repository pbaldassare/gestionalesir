// Gestione utenti del Gestionale SIR. Solo un profilo con ruolo 'admin' può chiamarla.
// Azioni: crea_utente, reimposta_password, imposta_attivo, elimina_utente.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await caller.auth.getUser();
  if (authError || !user) return json({ error: "Non autenticato" }, 401);

  const admin = createClient(url, serviceKey, { db: { schema: "gestionalesir" } });
  const { data: profilo } = await admin
    .from("profili")
    .select("ruolo, attivo")
    .eq("id", user.id)
    .maybeSingle();
  if (!profilo || profilo.ruolo !== "admin" || !profilo.attivo) {
    return json({ error: "Operazione riservata all'amministratore" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo della richiesta non valido" }, 400);
  }
  const azione = String(body.azione ?? "");

  try {
    switch (azione) {
      case "crea_utente": {
        const email = String(body.email ?? "").trim().toLowerCase();
        const password = String(body.password ?? "");
        const nome = String(body.nome_completo ?? "").trim();
        const ruolo = body.ruolo === "admin" ? "admin" : "utente";
        const ente_id = ruolo === "utente" ? String(body.ente_id ?? "") : null;
        if (!email || !password || !nome) return json({ error: "Email, password e nome sono obbligatori" }, 400);
        if (password.length < 8) return json({ error: "La password deve avere almeno 8 caratteri" }, 400);
        if (ruolo === "utente" && !ente_id) return json({ error: "Seleziona l'ente dell'utente" }, 400);

        const { data: created, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { app: "gestionalesir", full_name: nome },
        });
        if (error) return json({ error: error.message }, 400);

        const { error: pErr } = await admin.from("profili").insert({
          id: created.user.id,
          ente_id,
          ruolo,
          nome_completo: nome,
          email,
        });
        if (pErr) {
          await admin.auth.admin.deleteUser(created.user.id);
          return json({ error: pErr.message }, 400);
        }
        return json({ ok: true, id: created.user.id });
      }

      case "reimposta_password": {
        const id = String(body.id ?? "");
        const password = String(body.password ?? "");
        if (!id || password.length < 8) return json({ error: "Password di almeno 8 caratteri" }, 400);
        const { error } = await admin.auth.admin.updateUserById(id, { password });
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      case "imposta_attivo": {
        const id = String(body.id ?? "");
        const attivo = Boolean(body.attivo);
        if (id === user.id && !attivo) return json({ error: "Non puoi disattivare te stesso" }, 400);
        const { error } = await admin.from("profili").update({ attivo }).eq("id", id);
        if (error) return json({ error: error.message }, 400);
        await admin.auth.admin.updateUserById(id, { ban_duration: attivo ? "none" : "876000h" });
        return json({ ok: true });
      }

      case "elimina_utente": {
        const id = String(body.id ?? "");
        if (id === user.id) return json({ error: "Non puoi eliminare te stesso" }, 400);
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) return json({ error: error.message }, 400);
        return json({ ok: true });
      }

      default:
        return json({ error: `Azione sconosciuta: ${azione}` }, 400);
    }
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Errore imprevisto" }, 500);
  }
});
